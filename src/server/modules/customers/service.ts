import "server-only";
import { and, desc, eq, max, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { addresses, favorites, measurementProfiles, orders, users, type MeasurementValues } from "@/server/db/schema";
import { notFound } from "@/server/lib/errors";
import { MEASUREMENT_FIELDS, type Audience } from "@/lib/constants";

/* ─── Measurements ─── */
export function listMeasurements(userId: string) {
  return db.select().from(measurementProfiles).where(eq(measurementProfiles.userId, userId)).orderBy(desc(measurementProfiles.updatedAt));
}

/** Keeps only fields that belong to the chosen type and are sensible inch values. */
export function cleanMeasurements(gender: Audience, raw: Record<string, unknown>): MeasurementValues {
  const out: MeasurementValues = {};
  for (const f of MEASUREMENT_FIELDS[gender]) {
    const n = Number(raw[f]);
    if (Number.isFinite(n) && n > 0 && n <= 120) out[f] = Math.round(n * 4) / 4; // quarter-inch precision
  }
  return out;
}

export async function saveMeasurement(userId: string, id: string | null, input: { name: string; gender: Audience; values: MeasurementValues; notes: string | null }) {
  if (id) {
    const r = await db
      .update(measurementProfiles)
      .set(input)
      .where(and(eq(measurementProfiles.id, id), eq(measurementProfiles.userId, userId)))
      .returning({ id: measurementProfiles.id });
    if (!r.length) throw notFound();
    return id;
  }
  const [r] = await db.insert(measurementProfiles).values({ ...input, userId }).returning({ id: measurementProfiles.id });
  return r.id;
}

export async function deleteMeasurement(userId: string, id: string) {
  await db.delete(measurementProfiles).where(and(eq(measurementProfiles.id, id), eq(measurementProfiles.userId, userId)));
}

/* ─── Addresses ─── */
export function listAddresses(userId: string) {
  return db.select().from(addresses).where(eq(addresses.userId, userId)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
}

export async function saveAddress(userId: string, input: { label: string; line1: string; area: string | null; city: string; phone: string | null; lat: number | null; lng: number | null }) {
  const existing = await db.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, userId)).limit(1);
  await db.insert(addresses).values({ ...input, userId, isDefault: existing.length === 0 });
}

export async function deleteAddress(userId: string, id: string) {
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
}

export async function setDefaultAddress(userId: string, id: string) {
  await db.transaction(async (tx) => {
    await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    await tx
      .update(addresses)
      .set({ isDefault: true })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  });
}

/* ─── Favourites ─── */
export async function toggleFavorite(userId: string, tailorId: string) {
  const del = await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.tailorId, tailorId)))
    .returning();
  if (del.length) return false;
  await db.insert(favorites).values({ userId, tailorId }).onConflictDoNothing();
  return true;
}

export async function listFavoriteIds(userId: string) {
  const rows = await db.select({ tailorId: favorites.tailorId }).from(favorites).where(eq(favorites.userId, userId));
  return rows.map((r) => r.tailorId);
}

/* ─── Tailor's customer book (derived from orders) ─── */
export function listTailorCustomers(tailorId: string) {
  return db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      email: users.email,
      orders: sql<number>`count(${orders.id})::int`,
      spent: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} <> 'cancelled'), 0)::int`,
      lastOrderAt: max(orders.createdAt),
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.customerId))
    .where(and(eq(orders.tailorId, tailorId), sql`${orders.status} <> 'pending_payment'`))
    .groupBy(users.id)
    .orderBy(desc(max(orders.createdAt)))
    .limit(500);
}

export function listCustomerOrdersForTailor(tailorId: string, customerId: string) {
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.tailorId, tailorId), eq(orders.customerId, customerId), sql`${orders.status} <> 'pending_payment'`))
    .orderBy(desc(orders.createdAt));
}
