import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/lib/errors";
import { env } from "@/server/env";

/** JSON helpers for route handlers: auth, same-origin CSRF check, error mapping. */
export async function apiUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("forbidden", 401);
  return user;
}

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // same-origin fetches from older browsers / server-to-server
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let ok = false;
  try {
    const o = new URL(origin);
    ok = o.host === host || o.origin === new URL(env.NEXT_PUBLIC_APP_URL).origin;
  } catch {
    ok = false;
  }
  if (!ok) throw new AppError("forbidden", 403);
}

export function handle(fn: () => Promise<Response>) {
  return fn().catch((e) => {
    if (e instanceof AppError) return NextResponse.json({ error: e.code }, { status: e.status });
    console.error("[api]", e);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  });
}
