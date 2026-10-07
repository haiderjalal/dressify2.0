import "server-only";
import { headers } from "next/headers";
import { env } from "@/server/env";
import { AppError } from "@/server/lib/errors";

/**
 * Fixed-window rate limiter.
 * - Production (multiple instances): Upstash Redis REST — shared counters.
 * - Single instance / development: in-memory map.
 */
const memory = new Map<string, { count: number; resetAt: number }>();

async function redisIncr(key: string, windowSec: number): Promise<number> {
  const res = await fetch(`${env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSec), "NX"],
    ]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const data = (await res.json()) as Array<{ result: number }>;
  return data[0].result;
}

export async function rateLimit(bucket: string, id: string, limit: number, windowSec: number) {
  const key = `rl:${bucket}:${id}:${Math.floor(Date.now() / (windowSec * 1000))}`;
  let count: number;
  if (env.features.redis) {
    try {
      count = await redisIncr(key, windowSec);
    } catch (e) {
      console.error("[rate-limit] redis unavailable, falling back to memory", e);
      count = memIncr(key, windowSec);
    }
  } else {
    count = memIncr(key, windowSec);
  }
  if (count > limit) throw new AppError("rateLimited", 429);
}

function memIncr(key: string, windowSec: number) {
  const now = Date.now();
  const hit = memory.get(key);
  if (!hit || hit.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    if (memory.size > 50_000) for (const [k, v] of memory) if (v.resetAt < now) memory.delete(k);
    return 1;
  }
  hit.count += 1;
  return hit.count;
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
