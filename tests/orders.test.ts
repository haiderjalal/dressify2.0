import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { fabrics, notifications, orders, tailorSlotUsage } from "@/server/db/schema";
import { getOrderForActor, placeOrder, transitionOrder, expireStalePayments } from "@/server/modules/orders/service";
import { completePayment } from "@/server/modules/payments/service";
import { AppError } from "@/server/lib/errors";
import { address, bookableDay, makeCustomer, makeTailor } from "./helpers";

const codOrder = (tailorId: string, designId: string, profileId: string, day: string) => ({
  tailorId,
  fabricSource: "own" as const,
  items: [{ designId, quantity: 1 }],
  measurementProfileId: profileId,
  slotDate: day,
  address,
  paymentMethod: "cod" as const,
});

describe("slot booking under concurrency", () => {
  it("never over-books a tailor's day", async () => {
    const { tailor, design } = await makeTailor({ capacity: 2 });
    const day = bookableDay(3);
    const customers = await Promise.all(Array.from({ length: 6 }, () => makeCustomer()));
    const results = await Promise.allSettled(customers.map((c) => placeOrder(c.actor, codOrder(tailor.id, design.id, c.profileId, day))));
    const ok = results.filter((r) => r.status === "fulfilled");
    const full = results.filter((r) => r.status === "rejected" && (r.reason as AppError).code === "slotFull");
    expect(ok).toHaveLength(2);
    expect(full).toHaveLength(4);
    const [usage] = await db.select().from(tailorSlotUsage).where(and(eq(tailorSlotUsage.tailorId, tailor.id), eq(tailorSlotUsage.day, day)));
    expect(usage.used).toBe(2);
  });

  it("rejects days outside the booking window", async () => {
    const { tailor, design } = await makeTailor();
    const c = await makeCustomer();
    await expect(placeOrder(c.actor, codOrder(tailor.id, design.id, c.profileId, bookableDay(-1)))).rejects.toMatchObject({ code: "invalidDate" });
    await expect(placeOrder(c.actor, codOrder(tailor.id, design.id, c.profileId, bookableDay(60)))).rejects.toMatchObject({ code: "invalidDate" });
  });
});

describe("fabric stock", () => {
  it("cannot sell more fabric than is in stock, even concurrently", async () => {
    const { tailor, design, fabric } = await makeTailor({ capacity: 10, fabricStock: 5 });
    const [a, b] = await Promise.all([makeCustomer(), makeCustomer()]);
    const body = (p: string) => ({ ...codOrder(tailor.id, design.id, p, bookableDay(4)), fabricSource: "store" as const, items: [{ designId: design.id, quantity: 1, fabricId: fabric.id, fabricMeters: 3 }] });
    const results = await Promise.allSettled([placeOrder(a.actor, body(a.profileId)), placeOrder(b.actor, body(b.profileId))]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const [f] = await db.select().from(fabrics).where(eq(fabrics.id, fabric.id));
    expect(f.stockMeters).toBe(2);
  });

  it("prices on the server and restores stock + slot when cancelled", async () => {
    const { tailor, design, fabric } = await makeTailor({ capacity: 1, fabricStock: 10 });
    const c = await makeCustomer();
    const day = bookableDay(5);
    const { order } = await placeOrder(c.actor, { ...codOrder(tailor.id, design.id, c.profileId, day), fabricSource: "store", items: [{ designId: design.id, quantity: 2, fabricId: fabric.id, fabricMeters: 2.5 }] });
    // 2 × 2000 stitching + 2 × 2.5 m × 500 fabric + 200 delivery
    expect(order.stitchingTotal).toBe(4000);
    expect(order.fabricTotal).toBe(2500);
    expect(order.total).toBe(6700);
    expect(order.commission).toBe(650);
    expect((await db.select().from(fabrics).where(eq(fabrics.id, fabric.id)))[0].stockMeters).toBe(5);

    await transitionOrder(c.actor, order.id, "cancel");
    expect((await db.select().from(fabrics).where(eq(fabrics.id, fabric.id)))[0].stockMeters).toBe(10);
    const [usage] = await db.select().from(tailorSlotUsage).where(and(eq(tailorSlotUsage.tailorId, tailor.id), eq(tailorSlotUsage.day, day)));
    expect(usage.used).toBe(0);
  });
});

describe("order lifecycle & authorisation", () => {
  it("walks the full own-fabric flow and enforces who can do what", async () => {
    const { tailor, design, user: tailorUser } = await makeTailor();
    const c = await makeCustomer();
    const stranger = await makeCustomer();
    const other = await makeTailor();
    const { order } = await placeOrder(c.actor, codOrder(tailor.id, design.id, c.profileId, bookableDay(2)));
    expect(order.status).toBe("placed");

    // Strangers can't see or touch it.
    expect(await getOrderForActor(stranger.actor, order.id)).toBeNull();
    await expect(transitionOrder(stranger.actor, order.id, "cancel")).rejects.toMatchObject({ code: "notFound" });
    await expect(transitionOrder(other.user, order.id, "accept")).rejects.toMatchObject({ code: "notFound" });
    // Customer can't do tailor steps.
    await expect(transitionOrder(c.actor, order.id, "accept")).rejects.toMatchObject({ code: "invalidTransition" });

    const rider = { name: "Waqas", phone: "03331112233" };
    await transitionOrder(tailorUser, order.id, "accept");
    await expect(transitionOrder(tailorUser, order.id, "start_stitching")).rejects.toMatchObject({ code: "invalidTransition" }); // own fabric must be picked up first
    await transitionOrder(tailorUser, order.id, "schedule_pickup", { rider });
    await transitionOrder(tailorUser, order.id, "mark_picked");
    await transitionOrder(tailorUser, order.id, "start_stitching");
    await transitionOrder(tailorUser, order.id, "mark_ready");
    await transitionOrder(tailorUser, order.id, "dispatch", { rider });
    // Customer can no longer cancel once it's being delivered.
    await expect(transitionOrder(c.actor, order.id, "cancel")).rejects.toMatchObject({ code: "invalidTransition" });
    const done = await transitionOrder(c.actor, order.id, "confirm_received");
    expect(done.status).toBe("delivered");
    expect(done.paymentStatus).toBe("paid"); // COD collected on delivery

    const notes = await db.select().from(notifications).where(eq(notifications.userId, c.actor.id));
    expect(notes.map((n) => n.type)).toEqual(expect.arrayContaining(["order_confirmed", "pickup_scheduled", "out_for_delivery"]));
  });

  it("rejects stale double-clicks (optimistic concurrency)", async () => {
    const { tailor, design, user } = await makeTailor();
    const c = await makeCustomer();
    const { order } = await placeOrder(c.actor, codOrder(tailor.id, design.id, c.profileId, bookableDay(2)));
    const results = await Promise.allSettled([transitionOrder(user, order.id, "accept"), transitionOrder(user, order.id, "accept")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
});

describe("online payments", () => {
  it("is idempotent when the gateway retries its callback", async () => {
    const { tailor, design, user: tailorUser } = await makeTailor();
    const c = await makeCustomer();
    const { order, payment } = await placeOrder(c.actor, { ...codOrder(tailor.id, design.id, c.profileId, bookableDay(2)), paymentMethod: "easypaisa" });
    expect(order.status).toBe("pending_payment");
    await completePayment(payment.id, "paid", "REF1", {});
    await completePayment(payment.id, "paid", "REF1", {});
    const [o] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(o.status).toBe("placed");
    expect(o.paymentStatus).toBe("paid");
    const tailorNotes = await db.select().from(notifications).where(and(eq(notifications.userId, tailorUser.id), eq(notifications.type, "order_placed")));
    expect(tailorNotes).toHaveLength(1);
  });

  it("releases the slot of unpaid orders after the hold expires", async () => {
    const { tailor, design } = await makeTailor({ capacity: 1 });
    const c = await makeCustomer();
    const day = bookableDay(6);
    const { order } = await placeOrder(c.actor, { ...codOrder(tailor.id, design.id, c.profileId, day), paymentMethod: "card" });
    const n = await expireStalePayments(new Date(Date.now() + 31 * 60_000));
    expect(n).toBeGreaterThanOrEqual(1);
    const [o] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(o.status).toBe("cancelled");
    const [usage] = await db.select().from(tailorSlotUsage).where(and(eq(tailorSlotUsage.tailorId, tailor.id), eq(tailorSlotUsage.day, day)));
    expect(usage.used).toBe(0);
  });
});
