import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Translator } from "@/i18n/core";
import type { Order } from "@/server/db/schema";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/orders/order-bits";
import { formatDate, formatPrice } from "@/lib/utils";

export interface CustomerOrderCardProps {
  t: Translator;
  order: Order;
  shopName: string;
  avatarUrl: string | null;
  itemCount: number;
}

export function CustomerOrderCard({ t: tr, order, shopName, avatarUrl, itemCount }: CustomerOrderCardProps) {
  const { t, locale } = tr;
  return (
    <Link href={`/account/orders/${order.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-paper p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <Avatar name={shopName} src={avatarUrl} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-sm font-medium">{order.number}</p>
          <StatusBadge t={tr} status={order.status} />
        </div>
        <p className="mt-1 truncate text-sm text-ink-soft">
          {shopName} · {t("orders.items")}: {itemCount}
        </p>
        <p className="text-xs text-muted">{t("orders.placedOn", { date: formatDate(order.createdAt, locale) })}</p>
      </div>
      <p className="shrink-0 font-semibold tabular-nums">{formatPrice(order.total, locale)}</p>
      <ChevronRight className="size-5 shrink-0 text-faint rtl:rotate-180" />
    </Link>
  );
}
