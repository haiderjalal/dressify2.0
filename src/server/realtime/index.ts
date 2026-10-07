import "server-only";
import Pusher from "pusher";
import { env } from "@/server/env";

/**
 * Realtime fan-out (chat messages, live notifications) via Pusher Channels —
 * or any Pusher-protocol server such as self-hosted Soketi.
 * When not configured, clients fall back to short polling automatically.
 */
let client: Pusher | null = null;
function pusher() {
  client ??= new Pusher({
    appId: env.PUSHER_APP_ID!,
    key: env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: env.PUSHER_SECRET!,
    cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
    useTLS: true,
  });
  return client;
}

export const channels = {
  user: (userId: string) => `private-user-${userId}`,
  order: (orderId: string) => `private-order-${orderId}`,
};

export async function publish(channel: string, event: string, data: unknown) {
  if (!env.features.pusher) return;
  try {
    await pusher().trigger(channel, event, data);
  } catch (e) {
    console.error("[realtime] publish failed", e);
  }
}

export function authorizeChannel(socketId: string, channel: string) {
  return pusher().authorizeChannel(socketId, channel);
}
