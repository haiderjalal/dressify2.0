import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { getOrderDetail } from "@/server/modules/orders/service";
import { Logo } from "@/components/shell/logo";
import { PrintButton } from "./print-button";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Invoice" };

/** Printable invoice — visible to the order's customer, its tailor and admins. */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await requireUser(undefined, `/invoice/${id}`);
  const detail = await getOrderDetail(user, id);
  if (!detail) notFound();
  const { t, tx, locale } = await getI18n();
  const { order, tailor, customer, items } = detail;

  return (
    <main className="min-h-dvh bg-sand/50 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl rounded-3xl border border-line bg-paper p-8 shadow-soft sm:p-12 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-6">
          <Logo />
          <div className="text-end">
            <p className="font-display text-3xl">{t("invoice.title")}</p>
            <p className="mt-1 text-sm text-muted">
              {t("invoice.number")} <span className="font-mono text-ink">{order.number}</span>
            </p>
            <p className="text-sm text-muted">
              {t("invoice.date")}: {formatDate(order.createdAt, locale)}
            </p>
          </div>
        </div>
        <div className="mt-10 grid gap-6 text-sm sm:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">{t("invoice.from")}</p>
            <p className="font-semibold">{tailor.shopName}</p>
            <p className="text-muted">{tailor.addressLine ?? [tailor.area, tailor.city].filter(Boolean).join(", ")}</p>
            {tailor.phone && <p className="text-muted" dir="ltr">{tailor.phone}</p>}
          </div>
          <div>
            <p className="eyebrow mb-2">{t("invoice.billedTo")}</p>
            <p className="font-semibold">{order.address.name || customer.name}</p>
            <p className="text-muted">{[order.address.line1, order.address.area, order.address.city].filter(Boolean).join(", ")}</p>
            <p className="text-muted" dir="ltr">{order.address.phone}</p>
          </div>
        </div>
        <table className="mt-10 w-full text-sm">
          <thead>
            <tr className="border-b border-ink text-start text-xs tracking-wide text-muted uppercase">
              <th className="py-2 text-start">{t("invoice.item")}</th>
              <th className="py-2 text-center">{t("invoice.qty")}</th>
              <th className="py-2 text-end">{t("invoice.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-line">
                <td className="py-3">
                  <p className="font-medium">{it.title}</p>
                  <p className="text-xs text-muted">
                    {tx(`categories.${it.category}`)}
                    {it.fabricName ? ` · ${it.fabricName} (${it.fabricMeters} m × ${formatPrice(it.fabricPricePerMeter ?? 0, locale)})` : ""}
                  </p>
                </td>
                <td className="py-3 text-center tabular-nums">{it.quantity}</td>
                <td className="py-3 text-end tabular-nums">{formatPrice(it.lineTotal, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ms-auto mt-6 max-w-xs space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">{t("invoice.subtotal")}</dt><dd className="tabular-nums">{formatPrice(order.stitchingTotal + order.fabricTotal, locale)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">{order.fabricSource === "own" ? t("booking.delivery") : t("booking.deliveryOnly")}</dt><dd className="tabular-nums">{formatPrice(order.deliveryFee, locale)}</dd></div>
          <div className="flex justify-between border-t border-ink pt-2 text-base font-semibold"><dt>{t("common.total")}</dt><dd className="tabular-nums">{formatPrice(order.total, locale)}</dd></div>
          <div className="flex justify-between text-xs text-muted"><dt>{t(`payment.${order.paymentMethod}`)}</dt><dd>{t(`paymentStatus.${order.paymentStatus}`)}</dd></div>
        </dl>
        <p className="mt-12 text-center text-xs text-muted">{t("invoice.footer")}</p>
        <div className="no-print mt-8 flex justify-center">
          <PrintButton label={t("common.print")} />
        </div>
      </div>
    </main>
  );
}
