import { NextResponse } from "next/server";
import { env } from "@/server/env";

/**
 * Easypaisa (Easypay) post-back endpoint.
 * Easypaisa's hosted checkout returns the shopper here; the result must then be
 * confirmed server-to-server with Easypaisa's transaction inquiry API using your
 * merchant credentials before calling `completePayment(paymentId, "paid", ...)`.
 * Until that inquiry is wired up with real credentials this endpoint never marks
 * an order paid — it only returns the shopper to their order page.
 */
export async function POST(req: Request) {
  return handle(req);
}
export async function GET(req: Request) {
  return handle(req);
}

async function handle(req: Request) {
  const url = new URL(req.url);
  const ref = url.searchParams.get("orderRefNumber") ?? url.searchParams.get("orderRefNum") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(ref)) return NextResponse.redirect(new URL("/account/orders", env.NEXT_PUBLIC_APP_URL), 303);
  // Look up the order for this payment and send the shopper back; status updates arrive via inquiry/IPN.
  const { getPayment } = await import("@/server/modules/payments/service");
  const p = await getPayment(ref);
  return NextResponse.redirect(new URL(p ? `/account/orders/${p.payment.orderId}?payment=pending` : "/account/orders", env.NEXT_PUBLIC_APP_URL), 303);
}
