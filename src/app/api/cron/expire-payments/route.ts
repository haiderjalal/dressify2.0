import { NextResponse } from "next/server";
import { env } from "@/server/env";
import { safeEqual } from "@/server/modules/payments/providers";
import { expireStalePayments } from "@/server/modules/orders/service";

/**
 * Releases slots held by online orders that were never paid.
 * Schedule every 5 minutes (Vercel Cron / any scheduler) with
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!safeEqual(token, env.CRON_SECRET)) return new NextResponse("Unauthorized", { status: 401 });
  const expired = await expireStalePayments();
  return NextResponse.json({ expired });
}
