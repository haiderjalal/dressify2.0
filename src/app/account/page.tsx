import Link from "next/link";
import { CalendarDays, Heart, MapPin, Ruler, ShoppingBag } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listCustomerOrders } from "@/server/modules/orders/service";
import { ACTIVE_ORDER_STATUSES } from "@/lib/constants";
import { Card, EmptyState, PageHeader, Stat } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { CustomerOrderCard } from "@/components/orders/customer-order-card";

export const metadata = { title: "My account" };

const RECENT_ORDERS = 3;

export default async function AccountPage() {
  const user = await requireUser("customer", "/account");
  const i18n = await getI18n();
  const { t } = i18n;
  const rows = await listCustomerOrders(user.id, 50);
  const active = rows.filter((r) => (ACTIVE_ORDER_STATUSES as readonly string[]).includes(r.order.status)).length;
  const delivered = rows.filter((r) => r.order.status === "delivered").length;

  const shortcuts = [
    { href: "/account/measurements", label: t("account.measurements"), icon: Ruler },
    { href: "/account/addresses", label: t("account.addresses"), icon: MapPin },
    { href: "/account/appointments", label: t("account.appointments"), icon: CalendarDays },
    { href: "/account/saved", label: t("account.saved"), icon: Heart },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title={t("account.hello", { name: user.name.split(" ")[0] })} action={<LinkButton href="/explore">{t("home.ctaExplore")}</LinkButton>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("account.orders")} value={rows.length} icon={<ShoppingBag />} />
        <Stat label={t("dash.filterActive")} value={active} tone="gold" />
        <Stat label={t("status.delivered")} value={delivered} tone="emerald" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t("orders.title")}</h2>
          {rows.length > RECENT_ORDERS && (
            <Link href="/account/orders" className="text-sm text-gold-deep hover:underline">
              {t("common.viewAll")}
            </Link>
          )}
        </div>
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
            {rows.slice(0, RECENT_ORDERS).map((r) => (
              <CustomerOrderCard key={r.order.id} t={i18n} order={r.order} shopName={r.shopName} avatarUrl={r.avatarUrl} itemCount={r.itemCount} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <span className="grid size-10 place-items-center rounded-full bg-gold-soft text-gold-deep">
                <Icon className="size-5" />
              </span>
              <span className="font-medium">{label}</span>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
