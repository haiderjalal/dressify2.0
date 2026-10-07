import { ShoppingBag } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listCustomerOrders } from "@/server/modules/orders/service";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { CustomerOrderCard } from "@/components/orders/customer-order-card";

export const metadata = { title: "My orders" };

export default async function CustomerOrdersPage() {
  const user = await requireUser("customer", "/account/orders");
  const i18n = await getI18n();
  const { t } = i18n;
  const rows = await listCustomerOrders(user.id);
  return (
    <>
      <PageHeader title={t("orders.title")} />
      {rows.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title={t("orders.empty")}
          action={
            <LinkButton href="/explore" size="sm">
              {t("orders.emptyCta")}
            </LinkButton>
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <CustomerOrderCard key={r.order.id} t={i18n} order={r.order} shopName={r.shopName} avatarUrl={r.avatarUrl} itemCount={r.itemCount} />
          ))}
        </div>
      )}
    </>
  );
}
