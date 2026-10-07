import "server-only";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, tailorProfiles, users, type Role } from "@/server/db/schema";
import { notFound } from "@/server/lib/errors";
import { invalidate } from "@/server/lib/cache";
import { notify } from "@/server/modules/notifications/service";

export async function platformStats() {
  const [[u], [t], [o]] = await Promise.all([
    db.select({ customers: sql<number>`count(*) filter (where ${users.role} = 'customer')::int` }).from(users),
    db
      .select({
        approved: sql<number>`count(*) filter (where ${tailorProfiles.status} = 'approved')::int`,
        pending: sql<number>`count(*) filter (where ${tailorProfiles.status} = 'pending')::int`,
        women: sql<number>`count(*) filter (where ${tailorProfiles.status} = 'approved' and ${tailorProfiles.isWomenLed})::int`,
      })
      .from(tailorProfiles),
    db
      .select({
        total: sql<number>`count(*) filter (where ${orders.status} not in ('pending_payment'))::int`,
        active: sql<number>`count(*) filter (where ${orders.status} in ('placed','confirmed','pickup_scheduled','fabric_picked','in_stitching','ready','out_for_delivery'))::int`,
        gmv: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} not in ('pending_payment','cancelled')), 0)::bigint`,
        commission: sql<number>`coalesce(sum(${orders.commission}) filter (where ${orders.status} = 'delivered'), 0)::bigint`,
      })
      .from(orders),
  ]);
  return { customers: u.customers, tailors: t.approved, pendingTailors: t.pending, womenTailors: t.women, orders: o.total, activeOrders: o.active, gmv: Number(o.gmv), commission: Number(o.commission) };
}

export function listTailorsByStatus(status: "pending" | "approved" | "suspended", q?: string) {
  return db
    .select({ t: tailorProfiles, ownerName: users.name, email: users.email })
    .from(tailorProfiles)
    .innerJoin(users, eq(users.id, tailorProfiles.userId))
    .where(and(eq(tailorProfiles.status, status), q ? or(ilike(tailorProfiles.shopName, `%${q}%`), ilike(users.email, `%${q}%`)) : undefined))
    .orderBy(desc(tailorProfiles.createdAt))
    .limit(200);
}

export async function setTailorStatus(tailorId: string, status: "approved" | "suspended") {
  const [t] = await db.update(tailorProfiles).set({ status }).where(eq(tailorProfiles.id, tailorId)).returning();
  if (!t) throw notFound();
  await invalidate(`tailor:${t.slug}`, "tailors:featured", "tailors:women", "designs:tryon:12");
  if (status === "approved") await notify(t.userId, "tailor_approved", {}, "/tailor");
}

export function listUsers(q?: string, role?: Role) {
  const term = q?.trim() ? `%${q.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  return db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, isActive: users.isActive, createdAt: users.createdAt, lastLoginAt: users.lastLoginAt })
    .from(users)
    .where(and(role ? eq(users.role, role) : undefined, term ? or(ilike(users.name, term), ilike(users.email, term), ilike(users.phone, term)) : undefined))
    .orderBy(desc(users.createdAt))
    .limit(200);
}

export async function setUserActive(adminId: string, userId: string, isActive: boolean) {
  if (adminId === userId) return; // never lock yourself out
  // Deactivating also revokes every live session immediately.
  await db
    .update(users)
    .set({ isActive, sessionVersion: isActive ? undefined : sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId));
}

export function listAllOrders(status?: string, limit = 100) {
  return db
    .select({ order: orders, shopName: tailorProfiles.shopName, customerName: users.name })
    .from(orders)
    .innerJoin(tailorProfiles, eq(tailorProfiles.id, orders.tailorId))
    .innerJoin(users, eq(users.id, orders.customerId))
    .where(status ? eq(orders.status, status as typeof orders.$inferSelect.status) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}
