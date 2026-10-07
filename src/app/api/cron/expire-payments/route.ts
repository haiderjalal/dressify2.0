import { NextResponse } from "next/server";
import { env } from "@/server/env";
import { safeEqual } from "@/server/modules/payments/providers";
import { expireStalePayments } from "@/server/modules/orders/service";

/**
 * Releases slots held by online orders that were never paid.
 * Vercel Hobby runs this daily (see vercel.json). For more frequent
 * cleanup, use Vercel Pro or an external scheduler with
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!safeEqual(token, env.CRON_SECRET)) return new NextResponse("Unauthorized", { status: 401 });
  const expired = await expireStalePayments();
  return NextResponse.json({ expired });
}
