import "server-only";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db } from "@/server/db";
import { appointments, tailorProfiles, users } from "@/server/db/schema";
import { AppError, notFound } from "@/server/lib/errors";
import { notify } from "@/server/modules/notifications/service";
import { formatDateTime } from "@/lib/utils";

type NewAppointment = { tailorId: string; scheduledAt: Date; type: "measurement" | "consultation" | "fitting"; mode: "at_shop" | "home_visit"; notes: string | null; addressText: string | null };

export async function requestAppointment(customerId: string, input: NewAppointment) {
  const [t] = await db.select().from(tailorProfiles).where(eq(tailorProfiles.id, input.tailorId)).limit(1);
  if (!t || t.status !== "approved") throw new AppError("tailorUnavailable");
  if (input.mode === "home_visit" && !t.offersHomeVisit) throw new AppError("invalid");
  if (input.scheduledAt.getTime() < Date.now() + 60 * 60 * 1000) throw new AppError("invalidDate");
  const [a] = await db.insert(appointments).values({ ...input, customerId }).returning();
  const [c] = await db.select({ name: users.name }).from(users).where(eq(users.id, customerId));
  await notify(t.userId, "appointment_requested", { customer: c.name, date: formatDateTime(a.scheduledAt) }, "/tailor/appointments");
  return a;
}

export function listCustomerAppointments(customerId: string) {
  return db
    .select({ a: appointments, shopName: tailorProfiles.shopName, slug: tailorProfiles.slug, phone: tailorProfiles.phone })
    .from(appointments)
    .innerJoin(tailorProfiles, eq(tailorProfiles.id, appointments.tailorId))
    .where(eq(appointments.customerId, customerId))
    .orderBy(desc(appointments.scheduledAt))
    .limit(100);
}

export function listTailorAppointments(tailorId: string, from = new Date(Date.now() - 7 * 86400_000)) {
  return db
    .select({ a: appointments, customerName: users.name, customerPhone: users.phone })
    .from(appointments)
    .innerJoin(users, eq(users.id, appointments.customerId))
    .where(and(eq(appointments.tailorId, tailorId), gte(appointments.scheduledAt, from)))
    .orderBy(asc(appointments.scheduledAt))
    .limit(200);
}

const TRANSITIONS = {
  tailor: { confirm: { from: ["requested"], to: "confirmed" }, decline: { from: ["requested"], to: "cancelled" }, complete: { from: ["confirmed"], to: "completed" } },
  customer: { cancel: { from: ["requested", "confirmed"], to: "cancelled" } },
} as const;

export async function updateAppointment(actor: { id: string; role: "customer" | "tailor" }, appointmentId: string, action: string) {
  const [row] = await db
    .select({ a: appointments, tailorUserId: tailorProfiles.userId, shopName: tailorProfiles.shopName })
    .from(appointments)
    .innerJoin(tailorProfiles, eq(tailorProfiles.id, appointments.tailorId))
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  if (!row) throw notFound();
  const owns = actor.role === "tailor" ? row.tailorUserId === actor.id : row.a.customerId === actor.id;
  if (!owns) throw notFound();
  const rules = TRANSITIONS[actor.role] as Record<string, { from: readonly string[]; to: "confirmed" | "cancelled" | "completed" }>;
  const rule = rules[action];
  if (!rule || !rule.from.includes(row.a.status)) throw new AppError("invalidTransition", 409);
  await db.update(appointments).set({ status: rule.to }).where(and(eq(appointments.id, appointmentId), eq(appointments.status, row.a.status)));
  const recipient = actor.role === "tailor" ? row.a.customerId : row.tailorUserId;
  const type = rule.to === "confirmed" ? "appointment_confirmed" : rule.to === "completed" ? "appointment_completed" : "appointment_cancelled";
  await notify(recipient, type, { tailor: row.shopName, date: formatDateTime(row.a.scheduledAt) }, actor.role === "tailor" ? "/account/appointments" : "/tailor/appointments");
}
