import { NextResponse } from "next/server";
import { apiUser, assertSameOrigin, handle } from "@/server/lib/api";
import { authorizeChannel } from "@/server/realtime";
import { getOrderForActor } from "@/server/modules/orders/service";
import { AppError } from "@/server/lib/errors";
import { env } from "@/server/env";

/** Pusher private-channel auth: users may only join their own channel and their own orders. */
export function POST(req: Request) {
  return handle(async () => {
    if (!env.features.pusher) throw new AppError("notFound", 404);
    assertSameOrigin(req);
    const user = await apiUser();
    const form = new URLSearchParams(await req.text());
    const socketId = form.get("socket_id") ?? "";
    const channel = form.get("channel_name") ?? "";
    if (!/^\d+\.\d+$/.test(socketId)) throw new AppError("invalid", 400);
    let allowed = channel === `private-user-${user.id}`;
    const m = channel.match(/^private-order-([0-9a-f-]{36})$/);
    if (!allowed && m) allowed = Boolean(await getOrderForActor(user, m[1]));
    if (!allowed) throw new AppError("forbidden", 403);
    return NextResponse.json(authorizeChannel(socketId, channel));
  });
}
