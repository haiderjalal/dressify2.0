import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listTailorCustomers } from "@/server/modules/customers/service";
import { Avatar } from "@/components/ui/avatar";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Customers" };

export default async function TailorCustomersPage() {
  const { tailor } = await requireTailor();
  const { t, locale } = await getI18n();
  const customers = await listTailorCustomers(tailor.id);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-medium">{t("dash.customersTitle")}</h1>
      {customers.length === 0 ? (
        <p className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line-strong bg-paper/60 p-12 text-center text-lg text-muted">
          <Users className="size-10 text-gold" /> {t("dash.noCustomers")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {customers.map((c) => (
            <Link key={c.id} href={`/tailor/customers/${c.id}`} className="flex min-w-0 items-center gap-4 rounded-3xl border border-line bg-paper p-4 shadow-soft transition hover:shadow-lift">
              <Avatar name={c.name} size={52} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold">{c.name}</p>
                <p className="text-base text-muted">
                  {t("dash.ordersCount", { n: c.orders })} · {formatPrice(c.spent, locale)}
                </p>
                {c.lastOrderAt && (
                  <p className="text-sm text-faint">
                    {t("dash.lastOrder")}: {formatDate(c.lastOrderAt, locale)}
                  </p>
                )}
              </div>
              <ChevronRight className="size-6 shrink-0 text-faint rtl:rotate-180" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
