import "server-only";
import webpush from "web-push";
import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { notifications, pushSubscriptions, users } from "@/server/db/schema";
import { env } from "@/server/env";
import { channels, publish } from "@/server/realtime";
import { runAfter } from "@/server/lib/after";
import { isLocale, makeTranslator } from "@/i18n/core";
import type { Dictionary } from "@/i18n/en";

export type NotificationType = keyof Dictionary["notifications"]["types"];
type Data = Record<string, string | number | null>;

let vapidReady = false;
function ensureVapid() {
  if (!vapidReady && env.features.push) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
    vapidReady = true;
  }
  return vapidReady;
}

/**
 * Create in-app notifications, push them live to open tabs, and send a
 * device push (pop-up) in each recipient's own language.
 */
export async function notify(userIds: string | string[], type: NotificationType, data: Data, link: string | null = null) {
  const ids = [...new Set(Array.isArray(userIds) ? userIds : [userIds])];
  if (ids.length === 0) return;
  const rows = await db
    .insert(notifications)
    .values(ids.map((userId) => ({ userId, type, data, link })))
    .returning({ id: notifications.id, userId: notifications.userId, createdAt: notifications.createdAt });

  runAfter(async () => {
    await Promise.all(rows.map((r) => publish(channels.user(r.userId), "notification", { id: r.id, type, data, link, createdAt: r.createdAt })));
    if (ensureVapid()) await sendPush(ids, type, data, link);
  });
}

async function sendPush(userIds: string[], type: NotificationType, data: Data, link: string | null) {
  const subs = await db
    .select({ id: pushSubscriptions.id, endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth, locale: users.locale })
    .from(pushSubscriptions)
    .innerJoin(users, eq(users.id, pushSubscriptions.userId))
    .where(inArray(pushSubscriptions.userId, userIds));
  const dead: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      const { tx } = makeTranslator(isLocale(s.locale) ? s.locale : "en");
      const payload = JSON.stringify({
        title: tx(`notifications.types.${type}.title`, data),
        body: tx(`notifications.types.${type}.body`, data),
        url: link ?? "/",
        tag: `${type}:${data.number ?? ""}`,
      });
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
        else console.error("[push] send failed", code);
      }
    }),
  );
  if (dead.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, dead));
}

export async function listNotifications(userId: string, limit = 30, before?: Date) {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), before ? lt(notifications.createdAt, before) : undefined))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function unreadCount(userId: string) {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return r?.n ?? 0;
}

export async function markRead(userId: string, ids?: string[]) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), ids?.length ? inArray(notifications.id, ids) : undefined));
}

export async function saveSubscription(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
}
