import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { listAllOrders } from "@/server/modules/admin/service";
import { adminCancelOrderAction } from "@/server/actions/admin";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { LinkTabs } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/orders/order-bits";
import { AdminButton } from "@/components/admin/admin-button";
import { ORDER_STATUSES } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Orders · Admin" };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = (ORDER_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status : undefined;
  const i18n = await getI18n();
  const { t, locale } = i18n;
  const rows = await listAllOrders(status, 200);
  return (
    <>
      <PageHeader title={t("admin.orders")} />
      <LinkTabs className="mb-6" active={status ?? "all"} items={[{ key: "all", href: "/admin/orders", label: t("common.all") }, ...ORDER_STATUSES.map((s) => ({ key: s, href: `/admin/orders?status=${s}`, label: t(`status.${s}`) }))]} />
      {rows.length === 0 ? (
        <EmptyState title={t("admin.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper shadow-soft">
          <table className="w-full min-w-[760px] text-sm">
            <tbody className="divide-y divide-line">
              {rows.map(({ order, shopName, customerName }) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-mono"><Link href={`/invoice/${order.id}`} className="hover:underline">{order.number}</Link></td>
                  <td className="px-4 py-3">{customerName}<div className="text-xs text-muted">{shopName}</div></td>
                  <td className="px-4 py-3"><StatusBadge t={i18n} status={order.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted">{t(`payment.${order.paymentMethod}`)} · {t(`paymentStatus.${order.paymentStatus}`)}</td>
                  <td className="px-4 py-3 text-end tabular-nums">{formatPrice(order.total, locale)}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(order.createdAt, locale, { day: "numeric", month: "short" })}</td>
                  <td className="px-4 py-3 text-end">
                    {order.status !== "delivered" && order.status !== "cancelled" && <AdminButton action={adminCancelOrderAction} fields={{ orderId: order.id }} label={t("admin.adminCancel")} variant="danger-outline" confirm />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
