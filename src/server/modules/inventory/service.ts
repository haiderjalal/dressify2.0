import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { inventoryItems, inventoryLogs } from "@/server/db/schema";
import { notFound } from "@/server/lib/errors";

export type InventoryInput = { name: string; category: string; unit: string; quantity: number; lowStockAt: number; costPerUnit: number };

export function listInventory(tailorId: string) {
  return db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.tailorId, tailorId))
    .orderBy(desc(sql`${inventoryItems.quantity} <= ${inventoryItems.lowStockAt}`), asc(inventoryItems.category), asc(inventoryItems.name));
}

export async function lowStockCount(tailorId: string) {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(inventoryItems)
    .where(and(eq(inventoryItems.tailorId, tailorId), sql`${inventoryItems.quantity} <= ${inventoryItems.lowStockAt}`));
  return r?.n ?? 0;
}

export async function saveItem(tailorId: string, id: string | null, input: InventoryInput) {
  if (id) {
    const [prev] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.id, id), eq(inventoryItems.tailorId, tailorId)));
    if (!prev) throw notFound();
    await db.update(inventoryItems).set(input).where(eq(inventoryItems.id, id));
    const delta = input.quantity - prev.quantity;
    if (delta !== 0) await db.insert(inventoryLogs).values({ itemId: id, delta, reason: "edit" });
  } else {
    const [item] = await db.insert(inventoryItems).values({ ...input, tailorId }).returning();
    await db.insert(inventoryLogs).values({ itemId: item.id, delta: input.quantity, reason: "initial" });
  }
}

/** +/- buttons: atomic, never below zero. */
export async function adjustItem(tailorId: string, id: string, delta: number, reason: string | null) {
  const [item] = await db
    .update(inventoryItems)
    .set({ quantity: sql`greatest(${inventoryItems.quantity} + ${delta}, 0)` })
    .where(and(eq(inventoryItems.id, id), eq(inventoryItems.tailorId, tailorId)))
    .returning();
  if (!item) throw notFound();
  await db.insert(inventoryLogs).values({ itemId: id, delta, reason });
  return item;
}

export async function deleteItem(tailorId: string, id: string) {
  await db.delete(inventoryItems).where(and(eq(inventoryItems.id, id), eq(inventoryItems.tailorId, tailorId)));
}
