import Link from "next/link";
import { Banknote, Clock, Percent, ShoppingBag, Store, Users } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { listAllOrders, platformStats } from "@/server/modules/admin/service";
import { Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/orders/order-bits";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Overview · Admin" };

const RECENT_ORDERS = 8;

export default async function AdminOverview() {
  const i18n = await getI18n();
  const { t, locale } = i18n;
  const [stats, recent] = await Promise.all([platformStats(), listAllOrders(undefined, RECENT_ORDERS)]);

  return (
    <>
      <PageHeader title={t("admin.overview")} />

      {stats.pendingTailors > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warning-soft px-5 py-4 text-warning">
          <p className="flex items-center gap-2 font-medium">
            <Clock className="size-5" /> {t("admin.pendingTailors")}: {stats.pendingTailors}
          </p>
          <LinkButton href="/admin/tailors" size="sm" variant="outline">
            {t("admin.filterPending")}
          </LinkButton>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label={t("admin.totalUsers")} value={stats.customers} icon={<Users />} />
        <Stat label={t("admin.totalTailors")} value={stats.tailors} icon={<Store />} tone="emerald" />
        <Stat label={t("admin.totalOrders")} value={stats.orders} hint={`${t("admin.activeOrders")}: ${stats.activeOrders}`} icon={<ShoppingBag />} />
        <Stat label={t("admin.gmv")} value={formatPrice(stats.gmv, locale)} icon={<Banknote />} tone="gold" />
        <Stat label={t("admin.commission")} value={formatPrice(stats.commission, locale)} icon={<Percent />} tone="gold" />
        <Stat label={t("admin.pendingTailors")} value={stats.pendingTailors} icon={<Clock />} tone="warning" />
      </div>

      <Card className="mt-8">
        <CardHeader
          title={t("admin.recentOrders")}
          action={
            <Link href="/admin/orders" className="text-sm text-gold-deep hover:underline">
              {t("common.viewAll")}
            </Link>
          }
        />
        {recent.length === 0 ? (
          <EmptyState title={t("admin.empty")} className="m-4 border-0" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <tbody className="divide-y divide-line">
                {recent.map(({ order, shopName, customerName }) => (
                  <tr key={order.id}>
                    <td className="px-5 py-3 font-mono">
                      <Link href={`/invoice/${order.id}`} className="hover:underline">
                        {order.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      {customerName}
                      <div className="text-xs text-muted">{shopName}</div>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge t={i18n} status={order.status} />
                    </td>
                    <td className="px-5 py-3 text-end tabular-nums">{formatPrice(order.total, locale)}</td>
                    <td className="px-5 py-3 text-muted">{formatDate(order.createdAt, locale, { day: "numeric", month: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
