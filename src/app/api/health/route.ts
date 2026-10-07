import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

/** Liveness + DB readiness probe for load balancers / uptime monitors. */
export async function GET() {
  const started = Date.now();
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, db: "up", ms: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
