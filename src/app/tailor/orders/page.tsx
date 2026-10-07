import { ShoppingBag } from "lucide-react";
import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listTailorOrders, TAILOR_FILTERS } from "@/server/modules/orders/service";
import { unreadByOrder } from "@/server/modules/chat/service";
import { LinkTabs } from "@/components/ui/tabs";
import { TailorOrderCard } from "@/components/tailor/order-card";

export const metadata = { title: "Orders" };

type Filter = keyof typeof TAILOR_FILTERS;
const FILTERS: Filter[] = ["active", "new", "done", "cancelled"];
const LABELS = { active: "dash.filterActive", new: "dash.filterNew", done: "dash.filterDone", cancelled: "dash.filterCancelled" } as const;

export default async function TailorOrdersPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const sp = await searchParams;
  const filter: Filter = FILTERS.find((f) => f === sp.filter) ?? "active";
  const { user, tailor } = await requireTailor();
  const i18n = await getI18n();
  const { t } = i18n;
  const rows = await listTailorOrders(tailor.id, filter);
  const unread = await unreadByOrder(user.id, rows.map((r) => r.order.id));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-medium">{t("dash.nav.orders")}</h1>
      <LinkTabs size="lg" active={filter} items={FILTERS.map((f) => ({ key: f, href: f === "active" ? "/tailor/orders" : `/tailor/orders?filter=${f}`, label: t(LABELS[f]) }))} />
      {rows.length === 0 ? (
        <p className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line-strong bg-paper/60 p-12 text-center text-lg text-muted">
          <ShoppingBag className="size-10 text-gold" /> {t("dash.noOrders")}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((r) => (
            <TailorOrderCard key={r.order.id} t={i18n} order={r.order} customerName={r.customerName} firstItem={r.firstItem} itemCount={r.itemCount} unread={unread.get(r.order.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
