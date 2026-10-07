import "server-only";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db";
import { designs, fabrics, reviews, tailorProfiles, users } from "@/server/db/schema";
import { cached } from "@/server/lib/cache";

export type TailorSort = "recommended" | "rating" | "distance" | "price";
export type TailorSearch = {
  q?: string;
  category?: string;
  audience?: string;
  women?: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: TailorSort;
  limit?: number;
  offset?: number;
};

const t = tailorProfiles;
const ratingAvg = sql<number>`(${t.ratingSum}::float / greatest(${t.ratingCount}, 1))`;
const searchText = sql`(${t.shopName} || ' ' || coalesce(${t.area}, '') || ' ' || ${t.city})`;

export const tailorCardColumns = {
  id: t.id,
  slug: t.slug,
  shopName: t.shopName,
  area: t.area,
  city: t.city,
  lat: t.lat,
  lng: t.lng,
  avatarUrl: t.avatarUrl,
  coverUrl: t.coverUrl,
  ratingSum: t.ratingSum,
  ratingCount: t.ratingCount,
  priceFrom: t.priceFrom,
  isWomenLed: t.isWomenLed,
  isHomeBased: t.isHomeBased,
  specialties: t.specialties,
  yearsExperience: t.yearsExperience,
  ordersCompleted: t.ordersCompleted,
};

/**
 * Discovery query. With coordinates it uses the GiST earthdistance index:
 * `earth_box @> ll_to_earth` narrows candidates via the index, then the exact
 * great-circle distance filters the corners of the box.
 */
export async function searchTailors(p: TailorSearch) {
  const where: (SQL | undefined)[] = [eq(t.status, "approved")];
  const hasGeo = typeof p.lat === "number" && typeof p.lng === "number" && Number.isFinite(p.lat) && Number.isFinite(p.lng);
  const origin = hasGeo ? sql`ll_to_earth(${p.lat}, ${p.lng})` : null;
  const distanceKm = origin ? sql<number>`(earth_distance(${origin}, ll_to_earth(${t.lat}, ${t.lng})) / 1000.0)` : sql<number>`null::float`;

  if (p.q?.trim()) {
    const term = p.q.trim().slice(0, 60).replace(/[\\%_]/g, (c) => `\\${c}`);
    where.push(sql`${searchText} ilike ${`%${term}%`}`);
  }
  if (p.category) where.push(sql`${p.category} = any(${t.specialties})`);
  if (p.audience) where.push(sql`${p.audience} = any(${t.serves})`);
  if (p.women) where.push(eq(t.isWomenLed, true));
  if (origin && p.radiusKm) {
    const meters = p.radiusKm * 1000;
    where.push(sql`earth_box(${origin}, ${meters}) @> ll_to_earth(${t.lat}, ${t.lng})`);
    where.push(sql`earth_distance(${origin}, ll_to_earth(${t.lat}, ${t.lng})) <= ${meters}`);
  }

  const order: SQL[] = [];
  switch (p.sort) {
    case "rating":
      order.push(desc(ratingAvg), desc(t.ratingCount));
      break;
    case "price":
      order.push(asc(t.priceFrom));
      break;
    case "distance":
      if (origin) order.push(asc(distanceKm));
      break;
    default:
      // Recommended: quality first, gently penalise distance when known.
      order.push(origin ? desc(sql`${ratingAvg} * least(${t.ratingCount}, 20) / 20.0 - ${distanceKm} * 0.15`) : desc(sql`${ratingAvg} * least(${t.ratingCount}, 20)`));
  }
  order.push(desc(t.ordersCompleted), asc(t.id));

  const limit = Math.min(p.limit ?? 24, 100);
  const rows = await db
    .select({ ...tailorCardColumns, distanceKm })
    .from(t)
    .where(and(...where))
    .orderBy(...order)
    .limit(limit + 1)
    .offset(p.offset ?? 0);
  return { items: rows.slice(0, limit), hasMore: rows.length > limit };
}

export type TailorCard = Awaited<ReturnType<typeof searchTailors>>["items"][number];

/** Public profile — cached for 60 s (invalidated on edits). */
export function getPublicTailor(slug: string) {
  return cached(`tailor:${slug}`, 60, async () => {
    const [profile] = await db.select().from(t).where(and(eq(t.slug, slug), eq(t.status, "approved"))).limit(1);
    if (!profile) return null;
    const [designRows, fabricRows, reviewRows] = await Promise.all([
      db
        .select()
        .from(designs)
        .where(and(eq(designs.tailorId, profile.id), eq(designs.isActive, true)))
        .orderBy(desc(designs.createdAt))
        .limit(60),
      db
        .select()
        .from(fabrics)
        .where(and(eq(fabrics.tailorId, profile.id), eq(fabrics.isActive, true)))
        .orderBy(asc(fabrics.material), asc(fabrics.name))
        .limit(100),
      db
        .select({ id: reviews.id, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt, name: users.name })
        .from(reviews)
        .innerJoin(users, eq(users.id, reviews.customerId))
        .where(eq(reviews.tailorId, profile.id))
        .orderBy(desc(reviews.createdAt))
        .limit(10),
    ]);
    return { profile, designs: designRows, fabrics: fabricRows, reviews: reviewRows };
  });
}

export function getFeaturedTailors() {
  return cached("tailors:featured", 120, async () => (await searchTailors({ sort: "recommended", limit: 6 })).items);
}

export function getWomenLedTailors() {
  return cached("tailors:women", 120, async () => (await searchTailors({ women: true, sort: "rating", limit: 3 })).items);
}

/** Designs that have a try-on image — for the try-on gallery. */
export async function getTryOnDesigns(limit = 12) {
  return cached(`designs:tryon:${limit}`, 120, () =>
    db
      .select({ id: designs.id, title: designs.title, tryOnUrl: designs.tryOnUrl, images: designs.images, category: designs.category, price: designs.price, slug: t.slug, shopName: t.shopName })
      .from(designs)
      .innerJoin(t, eq(t.id, designs.tailorId))
      .where(and(eq(designs.isActive, true), sql`${designs.tryOnUrl} is not null`, eq(t.status, "approved")))
      .orderBy(desc(designs.createdAt))
      .limit(limit),
  );
}

export async function getDesignForTryOn(id: string) {
  const [row] = await db
    .select({ id: designs.id, title: designs.title, tryOnUrl: designs.tryOnUrl, images: designs.images, price: designs.price, category: designs.category, slug: t.slug, shopName: t.shopName })
    .from(designs)
    .innerJoin(t, eq(t.id, designs.tailorId))
    .where(and(eq(designs.id, id), eq(designs.isActive, true), eq(t.status, "approved")))
    .limit(1);
  return row ?? null;
}

export async function getTailorsByIds(ids: string[]) {
  if (!ids.length) return [];
  return db.select(tailorCardColumns).from(t).where(and(inArray(t.id, ids), eq(t.status, "approved")));
}

