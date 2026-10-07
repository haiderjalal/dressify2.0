import "server-only";
import { and, between, eq, sql } from "drizzle-orm";
import { db, type Tx } from "@/server/db";
import { tailorDayOverrides, tailorSlotUsage } from "@/server/db/schema";
import { AppError } from "@/server/lib/errors";
import { addDays, todayPK, weekday } from "@/lib/utils";
import { BOOKING_WINDOW_DAYS } from "@/lib/constants";

type TailorCap = { id: string; dailyCapacity: number; workingDays: number[] };
export type DaySlot = { day: string; capacity: number; used: number; available: number; closed: boolean };

/** First bookable day is tomorrow — the rider needs time to collect fabric. */
export const firstBookableDay = () => addDays(todayPK(), 1);

export async function getAvailability(t: TailorCap, days = 14, from = firstBookableDay()): Promise<DaySlot[]> {
  const to = addDays(from, days - 1);
  const [overrides, usage] = await Promise.all([
    db.select().from(tailorDayOverrides).where(and(eq(tailorDayOverrides.tailorId, t.id), between(tailorDayOverrides.day, from, to))),
    db.select().from(tailorSlotUsage).where(and(eq(tailorSlotUsage.tailorId, t.id), between(tailorSlotUsage.day, from, to))),
  ]);
  const ov = new Map(overrides.map((o) => [o.day, o.capacity]));
  const used = new Map(usage.map((u) => [u.day, u.used]));
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(from, i);
    const capacity = ov.get(day) ?? (t.workingDays.includes(weekday(day)) ? t.dailyCapacity : 0);
    const u = used.get(day) ?? 0;
    return { day, capacity, used: u, available: Math.max(capacity - u, 0), closed: capacity === 0 };
  });
}

export async function capacityFor(tx: Tx, t: TailorCap, day: string) {
  const [o] = await tx
    .select({ capacity: tailorDayOverrides.capacity })
    .from(tailorDayOverrides)
    .where(and(eq(tailorDayOverrides.tailorId, t.id), eq(tailorDayOverrides.day, day)))
    .limit(1);
  if (o) return o.capacity;
  return t.workingDays.includes(weekday(day)) ? t.dailyCapacity : 0;
}

/**
 * Atomically claim one slot. Uses a single conditional UPSERT so two customers
 * booking the last slot at the same instant can never both succeed.
 */
export async function reserveSlot(tx: Tx, t: TailorCap, day: string) {
  const min = firstBookableDay();
  if (day < min || day > addDays(min, BOOKING_WINDOW_DAYS)) throw new AppError("invalidDate");
  const capacity = await capacityFor(tx, t, day);
  if (capacity <= 0) throw new AppError("dayClosed");
  const rows = await tx
    .insert(tailorSlotUsage)
    .values({ tailorId: t.id, day, used: 1 })
    .onConflictDoUpdate({
      target: [tailorSlotUsage.tailorId, tailorSlotUsage.day],
      set: { used: sql`${tailorSlotUsage.used} + 1` },
      setWhere: sql`${tailorSlotUsage.used} < ${capacity}`,
    })
    .returning({ used: tailorSlotUsage.used });
  if (rows.length === 0) throw new AppError("slotFull", 409);
}

export async function releaseSlot(tx: Tx, tailorId: string, day: string) {
  await tx
    .update(tailorSlotUsage)
    .set({ used: sql`greatest(${tailorSlotUsage.used} - 1, 0)` })
    .where(and(eq(tailorSlotUsage.tailorId, tailorId), eq(tailorSlotUsage.day, day)));
}
