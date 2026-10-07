import "server-only";
import { randomInt } from "node:crypto";
import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db, type Tx } from "@/server/db";
import {
  addresses,
  designs,
  fabrics,
  measurementProfiles,
  orderEvents,
  orderItems,
  orders,
  payments,
  reviews,
  tailorProfiles,
  users,
  type Order,
  type OrderAddress,
  type OrderStatus,
  type PaymentMethod,
  type Rider,
  type Role,
} from "@/server/db/schema";
import { AppError, forbidden, notFound, pgError } from "@/server/lib/errors";
import { notify, type NotificationType } from "@/server/modules/notifications/service";
import { releaseSlot, reserveSlot } from "@/server/modules/tailors/availability";
import { invalidate } from "@/server/lib/cache";
import { addDays, formatDate } from "@/lib/utils";
import { PAYMENT_HOLD_MINUTES } from "@/lib/constants";
import { priceOrder } from "./pricing";
import { nextStatus, type OrderAction } from "./state";

export type Actor = { id: string; role: Role };

export type PlaceOrderInput = {
  tailorId: string;
  fabricSource: "own" | "store";
  items: { designId: string; quantity: number; fabricId?: string | null; fabricMeters?: number | null }[];
  measurementProfileId: string;
  slotDate: string;
  address: { addressId: string } | (Omit<OrderAddress, "lat" | "lng"> & { lat?: number | null; lng?: number | null; save?: boolean });
  notes?: string | null;
  paymentMethod: PaymentMethod;
};

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function orderNumber() {
  let s = "DF";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

/**
 * Places an order in one transaction: validates ownership of every referenced
 * row, prices it server-side, atomically reserves the tailor's slot and fabric
 * stock, and snapshots measurements + address so later edits don't change history.
 */
export async function placeOrder(customer: Actor, input: PlaceOrderInput) {
  if (customer.role !== "customer") throw forbidden();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await placeOrderOnce(customer, input);
    } catch (e) {
      // Retry only on the (astronomically rare) order-number collision.
      if (pgError(e).constraint === "orders_number_uq") continue;
      throw e;
    }
  }
  throw new AppError("generic", 500);
}

async function placeOrderOnce(customer: Actor, input: PlaceOrderInput) {
  const result = await db.transaction(async (tx) => {
    const [tailor] = await tx.select().from(tailorProfiles).where(eq(tailorProfiles.id, input.tailorId)).limit(1);
    if (!tailor || tailor.status !== "approved") throw new AppError("tailorUnavailable");

    const designIds = [...new Set(input.items.map((i) => i.designId))];
    const designRows = await tx
      .select()
      .from(designs)
      .where(and(inArray(designs.id, designIds), eq(designs.tailorId, tailor.id), eq(designs.isActive, true)));
    if (designRows.length !== designIds.length) throw notFound();
    const designById = new Map(designRows.map((d) => [d.id, d]));

    // Store fabric: lock + decrement stock atomically (fails if not enough left).
    const fabricById = new Map<string, typeof fabrics.$inferSelect>();
    if (input.fabricSource === "store") {
      const need = new Map<string, number>();
      for (const it of input.items) {
        if (!it.fabricId || !it.fabricMeters) throw new AppError("invalid");
        need.set(it.fabricId, (need.get(it.fabricId) ?? 0) + it.fabricMeters * it.quantity);
      }
      for (const [fabricId, meters] of need) {
        const [f] = await tx
          .update(fabrics)
          .set({ stockMeters: sql`${fabrics.stockMeters} - ${meters}` })
          .where(and(eq(fabrics.id, fabricId), eq(fabrics.tailorId, tailor.id), eq(fabrics.isActive, true), sql`${fabrics.stockMeters} >= ${meters}`))
          .returning();
        if (!f) throw new AppError("outOfStock", 409);
        fabricById.set(f.id, f);
      }
    }

    const [profile] = await tx
      .select()
      .from(measurementProfiles)
      .where(and(eq(measurementProfiles.id, input.measurementProfileId), eq(measurementProfiles.userId, customer.id)))
      .limit(1);
    if (!profile) throw notFound();

    let address: OrderAddress;
    if ("addressId" in input.address) {
      const [a] = await tx
        .select()
        .from(addresses)
        .where(and(eq(addresses.id, input.address.addressId), eq(addresses.userId, customer.id)))
        .limit(1);
      if (!a) throw notFound();
      const [u] = await tx.select({ name: users.name, phone: users.phone }).from(users).where(eq(users.id, customer.id));
      address = { name: u.name, phone: a.phone ?? u.phone ?? "", line1: a.line1, area: a.area, city: a.city, lat: a.lat, lng: a.lng };
    } else {
      const { save, ...addr } = input.address;
      address = addr;
      if (save) {
        await tx.insert(addresses).values({ userId: customer.id, label: "Home", line1: addr.line1, area: addr.area ?? null, city: addr.city, phone: addr.phone, lat: addr.lat ?? null, lng: addr.lng ?? null });
      }
    }

    await reserveSlot(tx, tailor, input.slotDate);

    const lines = input.items.map((it) => {
      const d = designById.get(it.designId)!;
      const f = it.fabricId ? fabricById.get(it.fabricId) : undefined;
      return { d, f, it, price: d.price, quantity: it.quantity, fabricPricePerMeter: f?.pricePerMeter ?? null, fabricMeters: f ? (it.fabricMeters ?? null) : null };
    });
    const money = priceOrder(lines, input.fabricSource);
    const maxDays = Math.max(...lines.map((l) => l.d.durationDays));
    const isCod = input.paymentMethod === "cod";

    const [order] = await tx
      .insert(orders)
      .values({
        number: orderNumber(),
        customerId: customer.id,
        tailorId: tailor.id,
        status: isCod ? "placed" : "pending_payment",
        fabricSource: input.fabricSource,
        paymentMethod: input.paymentMethod,
        paymentStatus: isCod ? "unpaid" : "pending",
        slotDate: input.slotDate,
        dueDate: addDays(input.slotDate, maxDays),
        measurements: { profileName: profile.name, gender: profile.gender, values: profile.values, notes: profile.notes },
        address,
        notes: input.notes ?? null,
        stitchingTotal: money.stitchingTotal,
        fabricTotal: money.fabricTotal,
        deliveryFee: money.deliveryFee,
        total: money.total,
        commission: money.commission,
        tailorPayout: money.tailorPayout,
      })
      .returning();

    await tx.insert(orderItems).values(
      lines.map((l, i) => ({
        orderId: order.id,
        designId: l.d.id,
        title: l.d.title,
        category: l.d.category,
        price: l.d.price,
        quantity: l.quantity,
        fabricId: l.f?.id ?? null,
        fabricName: l.f ? `${l.f.name} · ${l.f.colorName}` : null,
        fabricMeters: l.f ? l.fabricMeters : null,
        fabricPricePerMeter: l.f?.pricePerMeter ?? null,
        lineTotal: money.lineTotals[i],
        notes: null,
      })),
    );
    await tx.insert(orderEvents).values({ orderId: order.id, status: order.status, actorId: customer.id });
    const [payment] = await tx
      .insert(payments)
      .values({ orderId: order.id, provider: input.paymentMethod, amount: order.total, status: isCod ? "unpaid" : "pending" })
      .returning();

    const [cust] = await tx.select({ name: users.name }).from(users).where(eq(users.id, customer.id));
    return { order, payment, tailorUserId: tailor.userId, customerName: cust.name };
  });

  if (result.order.status === "placed") await announceNewOrder(result.order, result.tailorUserId, result.customerName);
  return { order: result.order, payment: result.payment };
}

export async function announceNewOrder(order: Pick<Order, "id" | "number" | "slotDate">, tailorUserId: string, customerName: string) {
  await notify(tailorUserId, "order_placed", { number: order.number, customer: customerName, date: formatDate(order.slotDate, "en", { day: "numeric", month: "short" }) }, `/tailor/orders/${order.id}`);
}

/* ─────────────────────────── Status transitions ─────────────────────────── */

const NOTIFY_CUSTOMER: Partial<Record<OrderStatus, NotificationType>> = {
  confirmed: "order_confirmed",
  pickup_scheduled: "pickup_scheduled",
  fabric_picked: "fabric_picked",
  in_stitching: "in_stitching",
  ready: "ready",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  cancelled: "order_cancelled",
};

export async function transitionOrder(actor: Actor, orderId: string, action: OrderAction, payload: { rider?: Rider; reason?: string | null } = {}) {
  const outcome = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ order: orders, tailorUserId: tailorProfiles.userId, shopName: tailorProfiles.shopName })
      .from(orders)
      .innerJoin(tailorProfiles, eq(tailorProfiles.id, orders.tailorId))
      .where(eq(orders.id, orderId))
      .for("update", { of: orders })
      .limit(1);
    if (!row) throw notFound();
    const { order } = row;

    const isOwner =
      actor.role === "admin" || (actor.role === "customer" && order.customerId === actor.id) || (actor.role === "tailor" && row.tailorUserId === actor.id);
    if (!isOwner) throw notFound(); // don't reveal other people's orders exist

    const to = nextStatus(action, order.status, actor.role, order.fabricSource);
    if (!to) throw new AppError("invalidTransition", 409);

    const patch: Partial<typeof orders.$inferInsert> = { status: to };
    if (action === "schedule_pickup") {
      if (!payload.rider) throw new AppError("required");
      patch.pickupRider = payload.rider;
    }
    if (action === "dispatch") {
      if (!payload.rider) throw new AppError("required");
      patch.deliveryRider = payload.rider;
    }
    if (to === "cancelled") {
      patch.cancelledBy = actor.role;
      patch.cancelReason = payload.reason ?? null;
      patch.paymentStatus = order.paymentStatus === "paid" ? "refund_pending" : order.paymentStatus === "pending" ? "failed" : order.paymentStatus;
      await restoreResources(tx, order);
    }
    if (to === "delivered") {
      patch.deliveredAt = new Date();
      if (order.paymentMethod === "cod") {
        patch.paymentStatus = "paid";
        await tx.update(payments).set({ status: "paid" }).where(and(eq(payments.orderId, order.id), eq(payments.provider, "cod")));
      }
      await tx
        .update(tailorProfiles)
        .set({ ordersCompleted: sql`${tailorProfiles.ordersCompleted} + 1` })
        .where(eq(tailorProfiles.id, order.tailorId));
    }

    // Optimistic guard: only update if nobody changed the status meanwhile.
    const [updated] = await tx
      .update(orders)
      .set(patch)
      .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
      .returning();
    if (!updated) throw new AppError("invalidTransition", 409);
    await tx.insert(orderEvents).values({ orderId: order.id, status: to, actorId: actor.id, note: payload.reason ?? null });
    return { order: updated, tailorUserId: row.tailorUserId, shopName: row.shopName, from: order.status };
  });

  const { order } = outcome;
  const type = NOTIFY_CUSTOMER[order.status];
  const rider = order.status === "pickup_scheduled" ? order.pickupRider : order.status === "out_for_delivery" ? order.deliveryRider : null;
  const data = { number: order.number, tailor: outcome.shopName, rider: rider?.name ?? "" };
  if (type && actor.id !== order.customerId) await notify(order.customerId, type, data, `/account/orders/${order.id}`);
  if (type && actor.role !== "tailor" && (order.status === "cancelled" || order.status === "delivered"))
    await notify(outcome.tailorUserId, type, data, `/tailor/orders/${order.id}`);
  return order;
}

/** Give back the tailor's slot and any store fabric reserved by an order. */
async function restoreResources(tx: Tx, order: Order) {
  await releaseSlot(tx, order.tailorId, order.slotDate);
  if (order.fabricSource === "store") {
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    for (const it of items) {
      if (it.fabricId && it.fabricMeters)
        await tx
          .update(fabrics)
          .set({ stockMeters: sql`${fabrics.stockMeters} + ${it.fabricMeters * it.quantity}` })
          .where(eq(fabrics.id, it.fabricId));
    }
  }
}

/** Cancels online orders whose payment never completed, freeing their slot (run by cron). */
export async function expireStalePayments(now = new Date()) {
  const cutoff = new Date(now.getTime() - PAYMENT_HOLD_MINUTES * 60_000);
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "pending_payment"), lt(orders.createdAt, cutoff)))
    .limit(500);
  let n = 0;
  for (const s of stale) {
    const done = await db.transaction(async (tx) => {
      const [o] = await tx.select().from(orders).where(eq(orders.id, s.id)).for("update").limit(1);
      if (!o || o.status !== "pending_payment") return false;
      await restoreResources(tx, o);
      await tx.update(orders).set({ status: "cancelled", paymentStatus: "failed", cancelReason: "payment_timeout" }).where(eq(orders.id, o.id));
      await tx.update(payments).set({ status: "failed" }).where(and(eq(payments.orderId, o.id), eq(payments.status, "pending")));
      await tx.insert(orderEvents).values({ orderId: o.id, status: "cancelled", note: "payment_timeout" });
      return true;
    });
    if (done) n++;
  }
  return n;
}

/* ─────────────────────────── Reads ─────────────────────────── */

/** Returns the order only if the actor is its customer, its tailor or an admin. */
export async function getOrderForActor(actor: Actor, orderId: string) {
  const [row] = await db
    .select({ order: orders, tailor: { id: tailorProfiles.id, userId: tailorProfiles.userId, shopName: tailorProfiles.shopName, slug: tailorProfiles.slug, phone: tailorProfiles.phone, city: tailorProfiles.city, area: tailorProfiles.area, addressLine: tailorProfiles.addressLine, avatarUrl: tailorProfiles.avatarUrl }, customer: { id: users.id, name: users.name, phone: users.phone, email: users.email } })
    .from(orders)
    .innerJoin(tailorProfiles, eq(tailorProfiles.id, orders.tailorId))
    .innerJoin(users, eq(users.id, orders.customerId))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row) return null;
  const allowed = actor.role === "admin" || row.order.customerId === actor.id || row.tailor.userId === actor.id;
  return allowed ? row : null;
}

export async function getOrderDetail(actor: Actor, orderId: string) {
  const base = await getOrderForActor(actor, orderId);
  if (!base) return null;
  const [items, events, review, paymentRows] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, orderId)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, orderId)).orderBy(asc(orderEvents.createdAt)),
    db.select().from(reviews).where(eq(reviews.orderId, orderId)).limit(1),
    db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(desc(payments.createdAt)),
  ]);
  return { ...base, items, events, review: review[0] ?? null, payments: paymentRows };
}

export async function listCustomerOrders(customerId: string, limit = 50) {
  return db
    .select({ order: orders, shopName: tailorProfiles.shopName, slug: tailorProfiles.slug, avatarUrl: tailorProfiles.avatarUrl, itemCount: sql<number>`(select count(*)::int from ${orderItems} where ${orderItems.orderId} = ${orders.id})` })
    .from(orders)
    .innerJoin(tailorProfiles, eq(tailorProfiles.id, orders.tailorId))
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export const TAILOR_FILTERS = {
  new: ["placed"],
  active: ["confirmed", "pickup_scheduled", "fabric_picked", "in_stitching", "ready", "out_for_delivery"],
  done: ["delivered"],
  cancelled: ["cancelled"],
} as const satisfies Record<string, OrderStatus[]>;

export async function listTailorOrders(tailorId: string, filter: keyof typeof TAILOR_FILTERS = "active", limit = 100) {
  return db
    .select({
      order: orders,
      customerName: users.name,
      customerPhone: users.phone,
      firstItem: sql<string>`(select ${orderItems.title} from ${orderItems} where ${orderItems.orderId} = ${orders.id} limit 1)`,
      itemCount: sql<number>`(select count(*)::int from ${orderItems} where ${orderItems.orderId} = ${orders.id})`,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.customerId))
    .where(and(eq(orders.tailorId, tailorId), inArray(orders.status, [...TAILOR_FILTERS[filter]])))
    .orderBy(filter === "active" ? asc(orders.dueDate) : desc(orders.createdAt))
    .limit(limit);
}

/* ─────────────────────────── Reviews ─────────────────────────── */

export async function addReview(customer: Actor, orderId: string, rating: number, comment: string | null) {
  const res = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.customerId, customer.id))).limit(1);
    if (!o) throw notFound();
    if (o.status !== "delivered") throw new AppError("invalidTransition");
    const inserted = await tx.insert(reviews).values({ orderId, customerId: customer.id, tailorId: o.tailorId, rating, comment }).onConflictDoNothing().returning();
    if (!inserted.length) throw new AppError("alreadyReviewed", 409);
    const [t] = await tx
      .update(tailorProfiles)
      .set({ ratingSum: sql`${tailorProfiles.ratingSum} + ${rating}`, ratingCount: sql`${tailorProfiles.ratingCount} + 1` })
      .where(eq(tailorProfiles.id, o.tailorId))
      .returning({ slug: tailorProfiles.slug, userId: tailorProfiles.userId });
    const [c] = await tx.select({ name: users.name }).from(users).where(eq(users.id, customer.id));
    return { t, name: c.name };
  });
  await invalidate(`tailor:${res.t.slug}`);
  await notify(res.t.userId, "new_review", { customer: res.name, rating }, `/tailor/orders/${orderId}`);
}

/** Counts and this-month earnings for the tailor home screen (single query). */
export async function tailorStats(tailorId: string) {
  const [r] = await db
    .select({
      newOrders: sql<number>`count(*) filter (where ${orders.status} = 'placed')::int`,
      toPickup: sql<number>`count(*) filter (where ${orders.status} in ('confirmed','pickup_scheduled') and ${orders.fabricSource} = 'own')::int`,
      stitching: sql<number>`count(*) filter (where ${orders.status} in ('fabric_picked','in_stitching') or (${orders.status} = 'confirmed' and ${orders.fabricSource} = 'store'))::int`,
      ready: sql<number>`count(*) filter (where ${orders.status} in ('ready','out_for_delivery'))::int`,
      earnings: sql<number>`coalesce(sum(${orders.tailorPayout}) filter (where ${orders.status} = 'delivered' and ${orders.deliveredAt} >= date_trunc('month', now() at time zone 'Asia/Karachi') at time zone 'Asia/Karachi'), 0)::int`,
    })
    .from(orders)
    .where(eq(orders.tailorId, tailorId));
  return r;
}
