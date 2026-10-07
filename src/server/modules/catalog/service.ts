import "server-only";
import { and, asc, between, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { designs, fabrics, tailorDayOverrides, tailorProfiles, type TailorProfile } from "@/server/db/schema";
import { notFound } from "@/server/lib/errors";
import { invalidate } from "@/server/lib/cache";

/**
 * Tailor-owned catalogue: designs (portfolio), fabric store, shop settings and
 * slot capacity. Every write is scoped by tailorId, so a tailor can only ever
 * touch their own rows — the id in the form is never trusted on its own.
 */

async function refreshPublic(t: Pick<TailorProfile, "id" | "slug">) {
  // Keep "Stitching from Rs X" in sync with the cheapest active design.
  await db
    .update(tailorProfiles)
    .set({ priceFrom: sql`coalesce((select min(${designs.price}) from ${designs} where ${designs.tailorId} = ${t.id} and ${designs.isActive}), 0)` })
    .where(eq(tailorProfiles.id, t.id));
  await invalidate(`tailor:${t.slug}`, "tailors:featured", "tailors:women", "designs:tryon:12");
}

/* ─── Designs ─── */
export type DesignInput = {
  title: string;
  description: string | null;
  category: string;
  audience: string;
  price: number;
  durationDays: number;
  isActive: boolean;
  images?: string[];
  tryOnUrl?: string | null;
};

export function listDesigns(tailorId: string) {
  return db.select().from(designs).where(eq(designs.tailorId, tailorId)).orderBy(desc(designs.createdAt));
}

export async function getDesign(tailorId: string, id: string) {
  const [d] = await db
    .select()
    .from(designs)
    .where(and(eq(designs.id, id), eq(designs.tailorId, tailorId)))
    .limit(1);
  return d ?? null;
}

export async function saveDesign(t: TailorProfile, id: string | null, input: DesignInput) {
  if (id) {
    const existing = await getDesign(t.id, id);
    if (!existing) throw notFound();
    const images = input.images?.length ? [...input.images, ...existing.images].slice(0, 6) : existing.images;
    await db
      .update(designs)
      .set({ ...input, images, tryOnUrl: input.tryOnUrl ?? existing.tryOnUrl })
      .where(and(eq(designs.id, id), eq(designs.tailorId, t.id)));
  } else {
    await db.insert(designs).values({ ...input, images: input.images ?? [], tailorId: t.id });
  }
  await refreshPublic(t);
}

export async function deleteDesign(t: TailorProfile, id: string) {
  // Soft-hide instead of delete: past orders still reference the design.
  await db
    .update(designs)
    .set({ isActive: false })
    .where(and(eq(designs.id, id), eq(designs.tailorId, t.id)));
  await refreshPublic(t);
}

/* ─── Fabrics ─── */
export type FabricInput = { name: string; material: string; colorName: string; colorHex: string; pricePerMeter: number; stockMeters: number; isActive: boolean; imageUrl?: string | null };

export function listFabrics(tailorId: string) {
  return db.select().from(fabrics).where(eq(fabrics.tailorId, tailorId)).orderBy(asc(fabrics.material), asc(fabrics.name));
}

export async function saveFabric(t: TailorProfile, id: string | null, input: FabricInput) {
  if (id) {
    const res = await db
      .update(fabrics)
      .set({ ...input, imageUrl: input.imageUrl ?? undefined })
      .where(and(eq(fabrics.id, id), eq(fabrics.tailorId, t.id)))
      .returning({ id: fabrics.id });
    if (!res.length) throw notFound();
  } else {
    await db.insert(fabrics).values({ ...input, tailorId: t.id });
  }
  await refreshPublic(t);
}

export async function deleteFabric(t: TailorProfile, id: string) {
  await db
    .update(fabrics)
    .set({ isActive: false })
    .where(and(eq(fabrics.id, id), eq(fabrics.tailorId, t.id)));
  await refreshPublic(t);
}

/* ─── Shop settings & capacity ─── */
export type ShopInput = {
  shopName: string;
  bio: string | null;
  phone: string;
  city: string;
  area: string | null;
  addressLine: string | null;
  lat: number;
  lng: number;
  serves: string[];
  specialties: string[];
  yearsExperience: number;
  isHomeBased: boolean;
  isWomenLed: boolean;
  offersHomeVisit: boolean;
  avatarUrl?: string;
  coverUrl?: string;
};

export async function updateShop(t: TailorProfile, input: ShopInput) {
  await db.update(tailorProfiles).set(input).where(eq(tailorProfiles.id, t.id));
  await refreshPublic(t);
}

export async function updateCapacity(t: TailorProfile, dailyCapacity: number, workingDays: number[]) {
  await db.update(tailorProfiles).set({ dailyCapacity, workingDays }).where(eq(tailorProfiles.id, t.id));
}

export async function setDayOverride(t: TailorProfile, day: string, capacity: number | null) {
  if (capacity === null) {
    await db.delete(tailorDayOverrides).where(and(eq(tailorDayOverrides.tailorId, t.id), eq(tailorDayOverrides.day, day)));
  } else {
    await db
      .insert(tailorDayOverrides)
      .values({ tailorId: t.id, day, capacity })
      .onConflictDoUpdate({ target: [tailorDayOverrides.tailorId, tailorDayOverrides.day], set: { capacity } });
  }
}

export function listOverrides(tailorId: string, from: string, to: string) {
  return db
    .select()
    .from(tailorDayOverrides)
    .where(and(eq(tailorDayOverrides.tailorId, tailorId), between(tailorDayOverrides.day, from, to)));
}
