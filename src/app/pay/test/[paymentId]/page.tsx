import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getPayment } from "@/server/modules/payments/service";
import { safeEqual, sign } from "@/server/modules/payments/providers";
import { env } from "@/server/env";
import { getI18n } from "@/i18n/server";
import { Logo } from "@/components/shell/logo";
import { Badge } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

/** Built-in test gateway (PAYMENTS_MODE=test only). Simulates Easypaisa / Safepay. */
export default async function TestGatewayPage({ params, searchParams }: { params: Promise<{ paymentId: string }>; searchParams: Promise<{ provider?: string; sig?: string }> }) {
  if (env.PAYMENTS_MODE !== "test") notFound();
  const { paymentId } = await params;
  const sp = await searchParams;
  const user = await requireUser("customer", `/pay/test/${paymentId}`);
  const p = await getPayment(paymentId);
  if (!p || p.customerId !== user.id || !sp.sig || !safeEqual(sign(`${paymentId}:${p.payment.amount}`), sp.sig)) notFound();
  const { t, locale } = await getI18n();
  const provider = sp.provider === "card" ? t("payment.card") : t("payment.easypaisa");

  return (
    <main className="grid min-h-dvh place-items-center bg-sand/60 p-5">
      <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-8 shadow-lift">
        <div className="flex items-center justify-between">
          <Logo />
          <Badge tone="warning">{t("common.testMode")}</Badge>
        </div>
        <h1 className="mt-8 font-display text-3xl">{t("payment.testGatewayTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("payment.testGatewayBody", { provider })}</p>
        <dl className="mt-6 space-y-2 rounded-2xl bg-sand/50 p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{t("orders.order", { number: "" })}</dt>
            <dd className="font-mono">{p.orderNumber}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>{t("payment.amount")}</dt>
            <dd className="tabular-nums">{formatPrice(p.payment.amount, locale)}</dd>
          </div>
        </dl>
        <div className="mt-6 grid gap-2">
          {(["paid", "failed"] as const).map((outcome) => (
            <form key={outcome} method="POST" action="/api/payments/test/callback">
              <input type="hidden" name="paymentId" value={paymentId} />
              <input type="hidden" name="outcome" value={outcome} />
              <input type="hidden" name="sig" value={sign(`${paymentId}:${outcome}`)} />
              <button type="submit" className={buttonClass(outcome === "paid" ? "emerald" : "danger-outline", "lg", "w-full")}>
                {outcome === "paid" ? t("payment.simulateSuccess") : t("payment.simulateFailure")}
              </button>
            </form>
          ))}
        </div>
        <p className="mt-6 flex items-center gap-2 text-xs text-muted">
          <ShieldCheck className="size-4 text-emerald" /> {t("booking.secureNote")}
        </p>
      </div>
    </main>
  );
}
