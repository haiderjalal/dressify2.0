import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, assertSameOrigin, handle } from "@/server/lib/api";
import { listNotifications, markRead, unreadCount } from "@/server/modules/notifications/service";
import { AppError } from "@/server/lib/errors";

/** GET ?since=ISO → new notifications + unread count (used by the live poller). */
export function GET(req: Request) {
  return handle(async () => {
    const user = await apiUser();
    const sp = new URL(req.url).searchParams;
    const since = sp.get("since");
    const limit = Math.min(Number(sp.get("limit")) || 20, 50);
    const now = new Date().toISOString();
    const [items, unread] = await Promise.all([since && !Number.isNaN(Date.parse(since)) ? listNotifications(user.id, limit).then((rows) => rows.filter((r) => r.createdAt > new Date(since))) : listNotifications(user.id, limit), unreadCount(user.id)]);
    return NextResponse.json({ items, unread, now }, { headers: { "Cache-Control": "no-store" } });
  });
}

const markSchema = z.object({ ids: z.array(z.uuid()).max(100).optional() });

/** POST { ids? } → mark as read (all when ids omitted). */
export function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await apiUser();
    const parsed = markSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new AppError("invalid", 400);
    await markRead(user.id, parsed.data.ids);
    return NextResponse.json({ ok: true });
  });
}
