import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { startCheckout } from "@/server/modules/payments/service";
import { AppError } from "@/server/lib/errors";
import { getI18n } from "@/i18n/server";
import { AutoSubmit } from "./auto-submit";

/** Hands the customer to the payment gateway for an order awaiting payment. */
export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const user = await requireUser("customer", `/pay/${orderId}`);
  const { t } = await getI18n();
  let checkout;
  try {
    checkout = await startCheckout(user.id, orderId);
  } catch (e) {
    if (e instanceof AppError) redirect(`/account/orders/${orderId}?payment=${e.code === "invalidTransition" ? "done" : "unavailable"}`);
    throw e;
  }
  if (checkout.kind === "redirect") redirect(checkout.url);
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <form id="gateway" method="POST" action={checkout.url}>
        {Object.entries(checkout.fields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <p className="text-muted">{t("common.loading")}</p>
        <noscript>
          <button type="submit" className="mt-4 underline">{t("common.continue")}</button>
        </noscript>
      </form>
      <AutoSubmit formId="gateway" />
    </main>
  );
}
