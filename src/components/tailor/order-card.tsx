import Link from "next/link";
import { CalendarDays, ChevronRight, MessageCircle } from "lucide-react";
import type { Translator } from "@/i18n/core";
import type { Order } from "@/server/db/schema";
import { tailorNextAction } from "@/server/modules/orders/state";
import { StatusBadge } from "@/components/orders/order-bits";
import { TailorOrderAction } from "./order-action";
import { cn, formatDate, formatPrice, todayPK } from "@/lib/utils";

export function TailorOrderCard({ t, order, customerName, firstItem, itemCount, unread, withAction = true }: { t: Translator; order: Order; customerName: string; firstItem: string; itemCount: number; unread?: number; withAction?: boolean }) {
  const next = tailorNextAction(order.status, order.fabricSource);
  const overdue = order.status !== "delivered" && order.status !== "cancelled" && order.dueDate < todayPK();
  return (
    <div className="min-w-0 rounded-3xl border border-line bg-paper p-5 shadow-soft">
      <Link href={`/tailor/orders/${order.id}`} className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge t={t} status={order.status} className="text-sm" />
            {unread ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-xs font-medium text-white">
                <MessageCircle className="size-3.5" /> {unread}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xl font-semibold">{customerName}</p>
          <p className="truncate text-base text-muted">
            {firstItem}
            {itemCount > 1 ? ` +${itemCount - 1}` : ""} · <span className="font-mono text-sm">{order.number}</span>
          </p>
          <p className={cn("mt-1 inline-flex items-center gap-1.5 text-base", overdue ? "font-medium text-danger" : "text-ink-soft")}>
            <CalendarDays className="size-5" /> {t.t("orders.due")}: {formatDate(order.dueDate, t.locale, { weekday: "short", day: "numeric", month: "short" })}
          </p>
        </div>
        <div className="text-end">
          <p className="text-lg font-semibold tabular-nums">{formatPrice(order.tailorPayout, t.locale)}</p>
          <ChevronRight className="ms-auto mt-6 size-6 text-faint rtl:rotate-180" />
        </div>
      </Link>
      {withAction && next && next !== "schedule_pickup" && next !== "dispatch" && (
        <div className="mt-4 border-t border-line pt-4">
          <TailorOrderAction orderId={order.id} action={next} compact />
        </div>
      )}
      {withAction && (next === "schedule_pickup" || next === "dispatch") && (
        <Link href={`/tailor/orders/${order.id}`} className="mt-4 flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-emerald text-lg font-semibold text-emerald">
          {t.t(next === "dispatch" ? "dash.dispatch" : "dash.schedulePickup")}
        </Link>
      )}
    </div>
  );
}
