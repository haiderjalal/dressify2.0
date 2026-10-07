import "server-only";
import { createCipheriv, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";
import { AppError } from "@/server/lib/errors";

/**
 * Payment gateway adapters.
 *
 * PAYMENTS_MODE=test → every online method goes to the built-in test gateway
 * (signed with PAYMENT_WEBHOOK_SECRET), so the whole flow works end-to-end
 * before merchant accounts exist.
 *
 * PAYMENTS_MODE=live → Easypaisa / Safepay adapters below. They follow each
 * gateway's hosted-checkout flow, but field names and signing MUST be checked
 * against the merchant integration guide you receive when onboarding, and tested
 * in the gateway sandbox before going live. A callback is only ever accepted
 * after its signature verifies — unverified callbacks never mark an order paid.
 */
export type CheckoutInput = {
  paymentId: string;
  orderNumber: string;
  amount: number;
  customer: { name: string; email: string; phone: string | null };
};
export type Checkout = { kind: "redirect"; url: string } | { kind: "form"; url: string; fields: Record<string, string> };

const appUrl = () => env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

export function sign(value: string, secret = env.PAYMENT_WEBHOOK_SECRET) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/* ─── Test gateway ─────────────────────────────────────────── */
export function testCheckout(input: CheckoutInput, provider: "easypaisa" | "card"): Checkout {
  const sig = sign(`${input.paymentId}:${input.amount}`);
  return { kind: "redirect", url: `${appUrl()}/pay/test/${input.paymentId}?provider=${provider}&sig=${sig}` };
}

/* ─── Easypaisa (Easypay hosted checkout) ──────────────────── */
function easypaisaHash(params: Record<string, string>) {
  // Sorted key=value pairs, AES-128-ECB with the store hash key, Base64.
  const plain = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const key = Buffer.from(env.EASYPAISA_HASH_KEY!, "utf8");
  const cipher = createCipheriv("aes-128-ecb", key, null);
  return Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]).toString("base64");
}

export function easypaisaCheckout(input: CheckoutInput): Checkout {
  if (!env.EASYPAISA_STORE_ID || !env.EASYPAISA_HASH_KEY) throw new AppError("paymentUnavailable");
  const params: Record<string, string> = {
    amount: input.amount.toFixed(1),
    orderRefNum: input.paymentId,
    paymentMethod: "MA_PAYMENT_METHOD",
    postBackURL: `${appUrl()}/api/payments/easypaisa/callback`,
    storeId: env.EASYPAISA_STORE_ID,
    timeStamp: new Date().toISOString().slice(0, 19),
  };
  return { kind: "form", url: env.EASYPAISA_CHECKOUT_URL!, fields: { ...params, merchantHashedReq: easypaisaHash(params) } };
}

/* ─── Safepay (cards) ──────────────────────────────────────── */
const safepayBase = () => (env.SAFEPAY_ENV === "production" ? "https://api.getsafepay.com" : "https://sandbox.api.getsafepay.com");

export async function safepayCheckout(input: CheckoutInput): Promise<Checkout> {
  if (!env.SAFEPAY_API_KEY || !env.SAFEPAY_SECRET_KEY) throw new AppError("paymentUnavailable");
  const res = await fetch(`${safepayBase()}/order/v1/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client: env.SAFEPAY_API_KEY, amount: input.amount, currency: "PKR", environment: env.SAFEPAY_ENV }),
    cache: "no-store",
  });
  if (!res.ok) throw new AppError("paymentUnavailable");
  const json = (await res.json()) as { data?: { token?: string } };
  const token = json.data?.token;
  if (!token) throw new AppError("paymentUnavailable");
  const q = new URLSearchParams({
    env: env.SAFEPAY_ENV,
    beacon: token,
    source: "custom",
    order_id: input.paymentId,
    redirect_url: `${appUrl()}/api/payments/safepay/callback`,
    cancel_url: `${appUrl()}/api/payments/safepay/callback?cancelled=1&order_id=${input.paymentId}`,
  });
  return { kind: "redirect", url: `${safepayBase()}/components?${q}` };
}

/** Safepay signs the tracker with your secret key (HMAC-SHA256, hex). */
export function verifySafepaySignature(tracker: string, signature: string) {
  if (!env.SAFEPAY_SECRET_KEY) return false;
  return safeEqual(sign(tracker, env.SAFEPAY_SECRET_KEY), signature);
}
