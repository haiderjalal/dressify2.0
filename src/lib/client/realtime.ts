"use client";

import type PusherType from "pusher-js";

/**
 * One shared Pusher connection per tab. Returns null when realtime isn't
 * configured — callers then poll instead.
 */
let instance: Promise<PusherType> | null = null;

export function realtimeEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_PUSHER_KEY);
}

export function getPusher(): Promise<PusherType> | null {
  if (!realtimeEnabled()) return null;
  instance ??= import("pusher-js").then(
    ({ default: Pusher }) =>
      new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2",
        channelAuthorization: { endpoint: "/api/realtime/auth", transport: "ajax" },
      }),
  );
  return instance;
}

export function subscribe(channel: string, event: string, cb: (data: unknown) => void) {
  const p = getPusher();
  if (!p) return () => {};
  let cancelled = false;
  let unbind = () => {};
  p.then((pusher) => {
    if (cancelled) return;
    const ch = pusher.subscribe(channel);
    ch.bind(event, cb);
    unbind = () => {
      ch.unbind(event, cb);
    };
  });
  return () => {
    cancelled = true;
    unbind();
  };
}
