import "server-only";
import { env } from "@/server/env";

/**
 * Read-through cache for hot public reads (tailor profiles, featured lists).
 * Uses Redis when configured (shared across instances), otherwise a bounded
 * in-memory LRU. Call `invalidate(key)` after writes.
 */
const MAX_ENTRIES = 2000;
const mem = new Map<string, { json: string; expiresAt: number }>();

async function redis(cmd: (string | number)[]) {
  const res = await fetch(env.UPSTASH_REDIS_REST_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

export async function cached<T>(key: string, ttlSec: number, load: () => Promise<T>): Promise<T> {
  const k = `c:${key}`;
  if (env.features.redis) {
    try {
      const hit = await redis(["GET", k]);
      if (typeof hit === "string") return JSON.parse(hit) as T;
      const value = await load();
      await redis(["SET", k, JSON.stringify(value), "EX", ttlSec]);
      return value;
    } catch (e) {
      console.error("[cache] redis error, using memory", e);
    }
  }
  const now = Date.now();
  const hit = mem.get(k);
  if (hit && hit.expiresAt > now) {
    mem.delete(k);
    mem.set(k, hit); // refresh LRU position
    return JSON.parse(hit.json) as T;
  }
  const value = await load();
  // Stored as JSON so memory and Redis behave identically (Dates become ISO strings).
  const json = JSON.stringify(value);
  mem.set(k, { json, expiresAt: now + ttlSec * 1000 });
  if (mem.size > MAX_ENTRIES) mem.delete(mem.keys().next().value!);
  return JSON.parse(json) as T;
}

export async function invalidate(...keys: string[]) {
  for (const key of keys) {
    mem.delete(`c:${key}`);
    if (env.features.redis) await redis(["DEL", `c:${key}`]).catch(() => undefined);
  }
}
