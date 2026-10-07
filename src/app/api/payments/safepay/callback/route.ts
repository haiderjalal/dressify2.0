import { NextResponse } from "next/server";
import { env } from "@/server/env";
import { completePayment } from "@/server/modules/payments/service";
import { verifySafepaySignature } from "@/server/modules/payments/providers";

/**
 * Safepay redirects the shopper here after checkout with `tracker` and `sig`.
 * The payment is only marked paid when the HMAC signature verifies.
 * TODO(go-live): also subscribe to Safepay webhooks for payments completed after the tab closes.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentId = url.searchParams.get("order_id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(paymentId)) return new NextResponse("Bad request", { status: 400 });
  const cancelled = url.searchParams.get("cancelled") === "1";
  const tracker = url.searchParams.get("tracker") ?? "";
  const sig = url.searchParams.get("sig") ?? "";
  let outcome: "paid" | "failed" = "failed";
  if (!cancelled && tracker && sig && verifySafepaySignature(tracker, sig)) outcome = "paid";
  const orderId = await completePayment(paymentId, outcome, tracker || null, Object.fromEntries(url.searchParams));
  return NextResponse.redirect(new URL(`/account/orders/${orderId}?payment=${outcome === "paid" ? "success" : "failed"}`, env.NEXT_PUBLIC_APP_URL), 303);
}
