import { Check } from "lucide-react";
import type { Translator } from "@/i18n/core";
import type { OrderStatus } from "@/server/db/schema";
import { Badge } from "@/components/ui/card";
import { MEASUREMENT_FIELDS, timelineFor } from "@/lib/constants";
import { cn, formatDateTime, formatPrice } from "@/lib/utils";

const TONE: Record<OrderStatus, "neutral" | "gold" | "emerald" | "success" | "warning" | "danger" | "info" | "dark"> = {
  pending_payment: "warning",
  placed: "gold",
  confirmed: "info",
  pickup_scheduled: "info",
  fabric_picked: "info",
  in_stitching: "emerald",
  ready: "success",
  out_for_delivery: "success",
  delivered: "dark",
  cancelled: "danger",
};

export function StatusBadge({ t, status, className }: { t: Translator; status: OrderStatus; className?: string }) {
  return (
    <Badge tone={TONE[status]} className={className}>
      {t.t(`status.${status}`)}
    </Badge>
  );
}

export function OrderTimeline({ t, status, fabricSource, events }: { t: Translator; status: OrderStatus; fabricSource: "own" | "store"; events: { status: OrderStatus; createdAt: Date | string }[] }) {
  const flow = timelineFor(fabricSource) as readonly OrderStatus[];
  const at = new Map(events.map((e) => [e.status, e.createdAt]));
  const current = flow.indexOf(status);
  if (status === "cancelled" || status === "pending_payment") {
    return (
      <ol className="space-y-3">
        {events.map((e, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span className={cn("size-2.5 rounded-full", e.status === "cancelled" ? "bg-danger" : "bg-line-strong")} />
            <span className="font-medium">{t.t(`status.${e.status}`)}</span>
            <span className="text-muted">{formatDateTime(e.createdAt, t.locale)}</span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className="relative">
      {flow.map((s, i) => {
        const done = i <= current;
        const isNow = i === current;
        return (
          <li key={s} className="relative flex gap-4 pb-6 last:pb-0">
            {i < flow.length - 1 && <span className={cn("absolute start-[13px] top-7 h-[calc(100%-1.25rem)] w-px", i < current ? "bg-emerald" : "bg-line")} />}
            <span className={cn("relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2", done ? "border-emerald bg-emerald text-paper" : "border-line bg-paper", isNow && "ring-4 ring-emerald/15")}>
              {done && <Check className="size-3.5" />}
            </span>
            <div className="pt-0.5">
              <p className={cn("text-sm", done ? "font-medium text-ink" : "text-muted")}>{t.t(`status.${s}`)}</p>
              {at.get(s) && <p className="text-xs text-muted">{formatDateTime(at.get(s)!, t.locale)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

type Item = { id: string; title: string; category: string; price: number; quantity: number; fabricName: string | null; fabricMeters: number | null; lineTotal: number };
type Money = { stitchingTotal: number; fabricTotal: number; deliveryFee: number; total: number; fabricSource: "own" | "store" };

export function OrderItems({ t, items, money }: { t: Translator; items: Item[]; money: Money }) {
  const { tx, locale } = t;
  return (
    <div>
      <ul className="divide-y divide-line">
        {items.map((it) => (
          <li key={it.id} className="flex justify-between gap-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium">
                {it.quantity} × {it.title}
              </p>
              <p className="text-xs text-muted">
                {tx(`categories.${it.category}`)}
                {it.fabricName ? ` · ${it.fabricName} · ${it.fabricMeters} m` : ""}
              </p>
            </div>
            <span className="shrink-0 tabular-nums">{formatPrice(it.lineTotal, locale)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-2 space-y-1.5 border-t border-line pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">{t.t("booking.stitching")}</dt>
          <dd className="tabular-nums">{formatPrice(money.stitchingTotal, locale)}</dd>
        </div>
        {money.fabricTotal > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted">{t.t("booking.fabric")}</dt>
            <dd className="tabular-nums">{formatPrice(money.fabricTotal, locale)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted">{money.fabricSource === "own" ? t.t("booking.delivery") : t.t("booking.deliveryOnly")}</dt>
          <dd className="tabular-nums">{formatPrice(money.deliveryFee, locale)}</dd>
        </div>
        <div className="flex justify-between pt-1 text-base font-semibold">
          <dt>{t.t("booking.total")}</dt>
          <dd className="tabular-nums">{formatPrice(money.total, locale)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function MeasurementGrid({ t, values, large }: { t: Translator; values: Record<string, number>; large?: boolean }) {
  return (
    <dl className={cn("grid gap-2", large ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3")}>
      {Object.entries(values)
        .sort(([a], [b]) => fieldRank(a) - fieldRank(b))
        .map(([k, v]) => (
        <div key={k} className="rounded-xl bg-sand/50 px-3 py-2">
          <dt className={cn("text-muted", large ? "text-sm" : "text-xs")}>{t.tx(`measurements.fields.${k}`)}</dt>
          <dd className={cn("font-semibold tabular-nums", large ? "text-xl" : "text-base")}>{v}″</dd>
        </div>
      ))}
    </dl>
  );
}

/** JSONB doesn't keep key order — show measurements in the order a tailor reads them. */
const ORDER = [...new Set([...MEASUREMENT_FIELDS.men, ...MEASUREMENT_FIELDS.women, ...MEASUREMENT_FIELDS.kids])] as string[];
function fieldRank(k: string) {
  const i = ORDER.indexOf(k);
  return i === -1 ? 999 : i;
}
