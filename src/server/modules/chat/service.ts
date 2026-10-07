import "server-only";
import { and, asc, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { messages, orders, tailorProfiles, users } from "@/server/db/schema";
import { notFound } from "@/server/lib/errors";
import { channels, publish } from "@/server/realtime";
import { notify } from "@/server/modules/notifications/service";
import { runAfter } from "@/server/lib/after";
import type { Actor } from "@/server/modules/orders/service";

/** Resolves the two participants of an order chat, enforcing access. */
async function participants(actor: Actor, orderId: string) {
  const [row] = await db
    .select({ id: orders.id, number: orders.number, status: orders.status, customerId: orders.customerId, tailorUserId: tailorProfiles.userId })
    .from(orders)
    .innerJoin(tailorProfiles, eq(tailorProfiles.id, orders.tailorId))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row) throw notFound();
  if (actor.role !== "admin" && actor.id !== row.customerId && actor.id !== row.tailorUserId) throw notFound();
  return row;
}

export type ChatMessage = { id: string; senderId: string; senderName: string; body: string; imageUrl: string | null; createdAt: string; readAt: string | null };

export async function listMessages(actor: Actor, orderId: string, after?: string) {
  await participants(actor, orderId);
  const rows = await db
    .select({ id: messages.id, senderId: messages.senderId, senderName: users.name, body: messages.body, imageUrl: messages.imageUrl, createdAt: messages.createdAt, readAt: messages.readAt })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.senderId))
    .where(and(eq(messages.orderId, orderId), after ? gt(messages.createdAt, new Date(after)) : undefined))
    .orderBy(asc(messages.createdAt))
    .limit(500);
  if (actor.role !== "admin" && rows.some((r) => r.senderId !== actor.id && !r.readAt)) {
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(and(eq(messages.orderId, orderId), ne(messages.senderId, actor.id), isNull(messages.readAt)));
  }
  return rows.map(serialize);
}

export async function sendMessage(actor: Actor, orderId: string, body: string, imageUrl: string | null = null) {
  const p = await participants(actor, orderId);
  if (actor.role === "admin") throw notFound(); // admins can read for support, not post
  const [m] = await db.insert(messages).values({ orderId, senderId: actor.id, body, imageUrl }).returning();
  const [sender] = await db.select({ name: users.name }).from(users).where(eq(users.id, actor.id));
  const msg = serialize({ ...m, senderName: sender.name });
  const recipient = actor.id === p.customerId ? p.tailorUserId : p.customerId;
  const link = recipient === p.customerId ? `/account/orders/${orderId}#chat` : `/tailor/orders/${orderId}#chat`;
  runAfter(() => publish(channels.order(orderId), "message", msg));
  await notify(recipient, "new_message", { sender: sender.name, preview: body.slice(0, 80), number: p.number }, link);
  return msg;
}

export async function unreadByOrder(userId: string, orderIds: string[]) {
  if (!orderIds.length) return new Map<string, number>();
  const rows = await db
    .select({ orderId: messages.orderId, n: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(inArray(messages.orderId, orderIds), ne(messages.senderId, userId), isNull(messages.readAt)))
    .groupBy(messages.orderId);
  return new Map(rows.map((r) => [r.orderId, r.n]));
}

function serialize(r: { id: string; senderId: string; senderName: string; body: string; imageUrl: string | null; createdAt: Date; readAt: Date | null }): ChatMessage {
  return { ...r, createdAt: r.createdAt.toISOString(), readAt: r.readAt?.toISOString() ?? null };
}
