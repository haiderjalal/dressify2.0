import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { designs, fabrics, measurementProfiles, tailorProfiles, users } from "@/server/db/schema";
import { addDays, todayPK, weekday } from "@/lib/utils";

/** Minimal fixtures: one tailor with a design + fabric, and N customers with measurements. */
export async function makeTailor(opts: { capacity?: number; fabricStock?: number } = {}) {
  const [u] = await db.insert(users).values({ role: "tailor", name: "Test Tailor", email: `t-${randomUUID()}@x.pk`, passwordHash: "x" }).returning();
  const [t] = await db
    .insert(tailorProfiles)
    .values({ userId: u.id, shopName: "Test Shop", slug: `test-${randomUUID()}`, city: "Lahore", lat: 31.52, lng: 74.35, status: "approved", dailyCapacity: opts.capacity ?? 2, workingDays: [0, 1, 2, 3, 4, 5, 6] })
    .returning();
  const [d] = await db.insert(designs).values({ tailorId: t.id, title: "Kurta", category: "kurta", audience: "men", price: 2000, durationDays: 4 }).returning();
  const [f] = await db.insert(fabrics).values({ tailorId: t.id, name: "Cotton", material: "cotton", colorName: "White", pricePerMeter: 500, stockMeters: opts.fabricStock ?? 100 }).returning();
  return { user: { id: u.id, role: "tailor" as const }, tailor: t, design: d, fabric: f };
}

export async function makeCustomer() {
  const [u] = await db.insert(users).values({ role: "customer", name: "Test Customer", email: `c-${randomUUID()}@x.pk`, phone: null, passwordHash: "x" }).returning();
  const [m] = await db.insert(measurementProfiles).values({ userId: u.id, name: "Me", gender: "men", values: { chest: 40, waist: 34, shoulder: 18 } }).returning();
  return { actor: { id: u.id, role: "customer" as const }, profileId: m.id };
}

/** A bookable day inside the window (tailor works every day in fixtures). */
export function bookableDay(offset = 2) {
  return addDays(todayPK(), offset);
}

export const address = { name: "Ali", phone: "03001234567", line1: "House 1, Street 2", area: "Gulberg", city: "Lahore" };
export { weekday };
