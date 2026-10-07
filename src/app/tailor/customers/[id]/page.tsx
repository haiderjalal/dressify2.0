import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listCustomerOrdersForTailor, listTailorCustomers } from "@/server/modules/customers/service";
import { StatusBadge } from "@/components/orders/order-bits";
import { buttonClass } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/utils";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { tailor } = await requireTailor();
  const i18n = await getI18n();
  const { t, locale } = i18n;
  const [customers, orders] = await Promise.all([listTailorCustomers(tailor.id), listCustomerOrdersForTailor(tailor.id, id)]);
  const c = customers.find((x) => x.id === id);
  if (!c || orders.length === 0) notFound();
  return (
    <div className="space-y-6">
      <Link href="/tailor/customers" className="inline-flex items-center gap-2 text-base text-muted hover:text-ink">
        <ArrowLeft className="size-5 rtl:rotate-180" /> {t("dash.customersTitle")}
      </Link>
      <div className="rounded-3xl border border-line bg-paper p-6 shadow-soft">
        <h1 className="text-3xl font-semibold">{c.name}</h1>
        <p className="mt-1 text-lg text-muted" dir="ltr">{c.phone}</p>
        <p className="mt-3 text-lg">
          {t("dash.ordersCount", { n: c.orders })} · {t("dash.totalSpent")} <b>{formatPrice(c.spent, locale)}</b>
        </p>
      </div>
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center gap-4 rounded-3xl border border-line bg-paper p-4 shadow-soft">
            <Link href={`/tailor/orders/${o.id}`} className="min-w-0 flex-1">
              <p className="font-mono text-base">{o.number}</p>
              <p className="text-base text-muted">{formatDate(o.createdAt, locale)}</p>
            </Link>
            <StatusBadge t={i18n} status={o.status} className="text-sm" />
            <p className="text-lg font-semibold tabular-nums">{formatPrice(o.total, locale)}</p>
            <Link href={`/invoice/${o.id}`} className={buttonClass("outline", "md")}>
              <FileText /> {t("dash.viewInvoice")}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
