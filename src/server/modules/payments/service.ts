import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orderEvents, orders, payments, tailorProfiles, users } from "@/server/db/schema";
import { env } from "@/server/env";
import { AppError, notFound } from "@/server/lib/errors";
import { notify } from "@/server/modules/notifications/service";
import { announceNewOrder } from "@/server/modules/orders/service";
import { easypaisaCheckout, safepayCheckout, testCheckout, type Checkout } from "./providers";

/** Builds the gateway checkout for an order still awaiting payment. */
export async function startCheckout(customerId: string, orderId: string): Promise<Checkout> {
  const [row] = await db
    .select({ order: orders, email: users.email, name: users.name, phone: users.phone })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.customerId))
    .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)))
    .limit(1);
  if (!row) throw notFound();
  const { order } = row;
  if (order.status !== "pending_payment" || order.paymentMethod === "cod") throw new AppError("invalidTransition");

  // Re-use the pending attempt, or open a new one after a failure.
  let [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, order.id), eq(payments.status, "pending")))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  if (!payment) {
    [payment] = await db.insert(payments).values({ orderId: order.id, provider: order.paymentMethod, amount: order.total, status: "pending" }).returning();
    await db.update(orders).set({ paymentStatus: "pending" }).where(eq(orders.id, order.id));
  }

  const input = { paymentId: payment.id, orderNumber: order.number, amount: payment.amount, customer: { name: row.name, email: row.email, phone: row.phone } };
  const method = order.paymentMethod as "easypaisa" | "card";
  if (env.PAYMENTS_MODE === "test") return testCheckout(input, method);
  return method === "easypaisa" ? easypaisaCheckout(input) : safepayCheckout(input);
}

/**
 * Records a verified gateway result. Idempotent: gateways retry callbacks, and
 * a payment that already reached a final state is never processed twice.
 */
export async function completePayment(paymentId: string, outcome: "paid" | "failed", providerRef: string | null, raw: unknown) {
  const res = await db.transaction(async (tx) => {
    const [p] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update").limit(1);
    if (!p) throw notFound();
    if (p.status !== "pending") return { orderId: p.orderId, changed: false as const };

    await tx.update(payments).set({ status: outcome, providerRef, payload: raw as object }).where(eq(payments.id, p.id));
    const [o] = await tx.select().from(orders).where(eq(orders.id, p.orderId)).for("update").limit(1);
    if (outcome === "failed" || o.status !== "pending_payment") {
      if (outcome === "paid") {
        // Paid after the hold expired / order cancelled → flag for refund.
        await tx.update(orders).set({ paymentStatus: "refund_pending" }).where(eq(orders.id, o.id));
      } else {
        await tx.update(orders).set({ paymentStatus: "failed" }).where(and(eq(orders.id, o.id), eq(orders.status, "pending_payment")));
      }
      return { orderId: o.id, changed: false as const };
    }
    const [updated] = await tx.update(orders).set({ status: "placed", paymentStatus: "paid" }).where(eq(orders.id, o.id)).returning();
    await tx.insert(orderEvents).values({ orderId: o.id, status: "placed", note: `paid:${p.provider}` });
    const [t] = await tx.select({ userId: tailorProfiles.userId }).from(tailorProfiles).where(eq(tailorProfiles.id, o.tailorId));
    const [c] = await tx.select({ name: users.name }).from(users).where(eq(users.id, o.customerId));
    return { orderId: o.id, changed: true as const, order: updated, tailorUserId: t.userId, customerName: c.name };
  });

  if (res.changed) {
    await announceNewOrder(res.order, res.tailorUserId, res.customerName);
    await notify(res.order.customerId, "payment_received", { number: res.order.number }, `/account/orders/${res.order.id}`);
  }
  return res.orderId;
}

export async function getPayment(paymentId: string) {
  const [p] = await db
    .select({ payment: payments, orderNumber: orders.number, customerId: orders.customerId })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(eq(payments.id, paymentId))
    .limit(1);
  return p ?? null;
}
