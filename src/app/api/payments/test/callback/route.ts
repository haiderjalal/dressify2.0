import { NextResponse } from "next/server";
import { env } from "@/server/env";
import { completePayment } from "@/server/modules/payments/service";
import { safeEqual, sign } from "@/server/modules/payments/providers";

/** Test-gateway callback. Disabled entirely when PAYMENTS_MODE=live. */
export async function POST(req: Request) {
  if (env.PAYMENTS_MODE !== "test") return new NextResponse("Not found", { status: 404 });
  const fd = await req.formData();
  const paymentId = String(fd.get("paymentId") ?? "");
  const outcome = fd.get("outcome") === "paid" ? "paid" : "failed";
  const sig = String(fd.get("sig") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(paymentId) || !safeEqual(sign(`${paymentId}:${outcome}`), sig)) return new NextResponse("Bad signature", { status: 400 });
  const orderId = await completePayment(paymentId, outcome, `TEST-${Date.now()}`, { simulated: true, outcome });
  return NextResponse.redirect(new URL(`/account/orders/${orderId}?payment=${outcome === "paid" ? "success" : "failed"}`, env.NEXT_PUBLIC_APP_URL), 303);
}
