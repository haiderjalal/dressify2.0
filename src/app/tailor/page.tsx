import Link from "next/link";
import { ArrowUpRight, BookOpen, Banknote, CalendarDays, CheckCircle2, PackageOpen, Scissors, Truck, TriangleAlert } from "lucide-react";
import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listTailorOrders, tailorStats } from "@/server/modules/orders/service";
import { tailorNextAction } from "@/server/modules/orders/state";
import { unreadByOrder } from "@/server/modules/chat/service";
import { lowStockCount } from "@/server/modules/inventory/service";
import { getAvailability } from "@/server/modules/tailors/availability";
import { TailorOrderCard } from "@/components/tailor/order-card";
import { COMMISSION_PERCENT } from "@/lib/constants";
import { cn, formatDate, formatPrice, todayPK } from "@/lib/utils";
import { listWorkshopJobs } from "@/server/modules/workshop/service";
import { workshopSummary } from "@/lib/workshop";

export const metadata = { title: "Home" };

const ACTION_LIMIT = 6;
const WEEK_DAYS = 7;

export default async function TailorHome() {
  const { user, tailor } = await requireTailor();
  const i18n = await getI18n();
  const { t, locale } = i18n;

  const [stats, newOrders, activeOrders, lowStock, week, jobs] = await Promise.all([
    tailorStats(tailor.id),
    listTailorOrders(tailor.id, "new", ACTION_LIMIT),
    listTailorOrders(tailor.id, "active", ACTION_LIMIT * 2),
    lowStockCount(tailor.id),
    getAvailability(tailor, WEEK_DAYS),
    listWorkshopJobs(tailor.id),
  ]);
  const needsAction = [...newOrders, ...activeOrders.filter((r) => tailorNextAction(r.order.status, r.order.fabricSource) !== null)].slice(0, ACTION_LIMIT);
  const unread = await unreadByOrder(user.id, needsAction.map((r) => r.order.id));
  const openSlots = week.reduce((sum, d) => sum + d.available, 0);
  const book = workshopSummary(jobs, todayPK());

  const tiles = [
    { key: "new", href: "/tailor/orders?filter=new", label: t("dash.newOrders"), value: stats.newOrders, icon: PackageOpen, tone: "bg-gold-soft text-gold-deep", highlight: stats.newOrders > 0 },
    { key: "pickup", href: "/tailor/orders", label: t("dash.toPickup"), value: stats.toPickup, icon: Truck, tone: "bg-info-soft text-info", highlight: false },
    { key: "stitching", href: "/tailor/orders", label: t("dash.stitching"), value: stats.stitching, icon: Scissors, tone: "bg-emerald-soft text-emerald", highlight: false },
    { key: "ready", href: "/tailor/orders", label: t("dash.readyCount"), value: stats.ready, icon: CheckCircle2, tone: "bg-success-soft text-success", highlight: false },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">{t("workshop.today")}</p><h1 className="mt-2 font-display text-5xl font-semibold">{t("dash.greeting", { name: user.name.split(" ")[0] })}</h1><p className="mt-2 text-muted">{t("dash.todayTitle")}</p></div>
        <span className="rounded-lg border border-line bg-paper px-4 py-2 text-sm text-muted">{formatDate(todayPK(), locale, { weekday: "long", day: "numeric", month: "short" })}</span>
      </div>

      <section className="counter-banner">
        <div><span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl border border-emerald/15 bg-paper/60"><BookOpen className="size-6" /></span><h2 className="font-display text-3xl font-semibold">{t("workshop.quick")}</h2><p className="mt-2 max-w-md text-sm text-muted">{t("workshop.quickHint")}</p><Link href="/tailor/workshop" className="mt-5 inline-flex min-h-12 items-center gap-3 font-semibold">{t("workshop.browse")}<ArrowUpRight className="size-5" /></Link></div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-6">{([["active", book.active], ["dueToday", book.dueToday], ["overdue", book.overdue], ["ready", book.ready]] as const).map(([key, value]) => <div key={key}><p className={cn("text-4xl font-semibold tabular-nums", key === "overdue" && value > 0 && "text-danger")}>{value}</p><p className="mt-1 text-sm text-muted">{t(`workshop.${key}`)}</p></div>)}</div>
      </section>

      <p className="eyebrow">{t("workshop.online")}</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(({ key, href, label, value, icon: Icon, tone, highlight }) => (
          <Link key={key} href={href} className={cn("rounded-3xl border bg-paper p-5 shadow-soft transition hover:shadow-lift", highlight ? "border-gold" : "border-line")}>
            <span className={cn("grid size-11 place-items-center rounded-full", tone)}>
              <Icon className="size-6" />
            </span>
            <p className="mt-4 text-4xl font-semibold tabular-nums">{value}</p>
            <p className="mt-1 text-base text-muted">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-line bg-paper p-5 shadow-soft">
          <p className="flex items-center gap-2 text-base text-muted">
            <Banknote className="size-5 text-gold" /> {t("dash.earnings")}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{formatPrice(stats.earnings, locale)}</p>
          <p className="mt-1 text-sm text-muted">{t("dash.earningsHint", { pct: COMMISSION_PERCENT })}</p>
        </div>
        <Link href="/tailor/availability" className="rounded-3xl border border-line bg-paper p-5 shadow-soft transition hover:shadow-lift">
          <p className="flex items-center gap-2 text-base text-muted">
            <CalendarDays className="size-5 text-gold" /> {t("dash.openSlots")}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{openSlots}</p>
        </Link>
        <Link href="/tailor/inventory" className={cn("rounded-3xl border bg-paper p-5 shadow-soft transition hover:shadow-lift", lowStock > 0 ? "border-danger/40" : "border-line")}>
          <p className="flex items-center gap-2 text-base text-muted">
            <TriangleAlert className={cn("size-5", lowStock > 0 ? "text-danger" : "text-gold")} /> {t("dash.lowStock")}
          </p>
          <p className={cn("mt-2 text-3xl font-semibold tabular-nums", lowStock > 0 && "text-danger")}>{lowStock}</p>
        </Link>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t("dash.needsAction")}</h2>
        {needsAction.length === 0 ? (
          <p className="flex items-center gap-3 rounded-3xl border border-dashed border-line-strong bg-paper/60 p-8 text-lg text-muted">
            <CheckCircle2 className="size-8 text-success" /> {t("dash.nothingToDo")}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {needsAction.map((r) => (
              <TailorOrderCard key={r.order.id} t={i18n} order={r.order} customerName={r.customerName} firstItem={r.firstItem} itemCount={r.itemCount} unread={unread.get(r.order.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
