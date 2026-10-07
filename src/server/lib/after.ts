import "server-only";
import { after } from "next/server";

/**
 * Run non-critical work (push delivery, realtime fan-out) after the response is sent,
 * so users never wait on third-party APIs. Falls back to fire-and-forget outside a
 * request scope (scripts, tests).
 */
export function runAfter(fn: () => Promise<unknown>) {
  const safe = () => fn().catch((e) => console.error("[after] background task failed", e));
  try {
    after(safe);
  } catch {
    void safe();
  }
}
