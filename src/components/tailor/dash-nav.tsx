"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarClock, CalendarDays, Home, LayoutGrid, MessagesSquare, Package, Palette, ShoppingBag, Store, Users, Shirt } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/tailor", key: "home", icon: Home },
  { href: "/tailor/workshop", key: "workshop", icon: BookOpen },
  { href: "/tailor/orders", key: "orders", icon: ShoppingBag },
  { href: "/tailor/appointments", key: "appointments", icon: CalendarClock },
  { href: "/tailor/availability", key: "availability", icon: CalendarDays },
  { href: "/tailor/portfolio", key: "portfolio", icon: Shirt },
  { href: "/tailor/fabrics", key: "fabrics", icon: Palette },
  { href: "/tailor/inventory", key: "inventory", icon: Package },
  { href: "/tailor/customers", key: "customers", icon: Users },
  { href: "/tailor/community", key: "community", icon: MessagesSquare },
  { href: "/tailor/shop", key: "shop", icon: Store },
] as const;

const MOBILE = ["home", "workshop", "orders", "availability"] as const;

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/tailor" ? path === "/tailor" : path.startsWith(href));
}

export function DashSidebar({ newOrders }: { newOrders: number }) {
  const { t } = useI18n();
  const active = useActive();
  return (
    <nav className="atelier-nav space-y-1" aria-label={t("nav.tailorDashboard")}>
      {ITEMS.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          aria-current={active(it.href) ? "page" : undefined}
          className={cn("flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-[17px] font-medium transition", active(it.href) ? "bg-ink text-paper" : "text-ink-soft hover:bg-sand")}
        >
          <it.icon className="size-6 shrink-0" />
          <span className="flex-1">{it.key === "workshop" ? t("workshop.workshop") : t(`dash.nav.${it.key}`)}</span>
          {it.key === "orders" && newOrders > 0 && <span className="grid min-w-7 place-items-center rounded-full bg-danger px-1.5 text-sm text-white">{newOrders}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function DashBottomNav({ newOrders }: { newOrders: number }) {
  const { t } = useI18n();
  const active = useActive();
  const items = ITEMS.filter((i) => (MOBILE as readonly string[]).includes(i.key));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-5">
        {items.map((it) => (
          <Link key={it.key} href={it.href} className={cn("relative flex flex-col items-center gap-1 py-2.5 text-xs font-medium", active(it.href) ? "text-ink" : "text-muted")}>
            <it.icon className={cn("size-7", active(it.href) && "text-gold-deep")} />
            {it.key === "workshop" ? t("workshop.workshop") : t(`dash.nav.${it.key}`)}
            {it.key === "orders" && newOrders > 0 && <span className="absolute top-1.5 start-[55%] grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] text-white">{newOrders}</span>}
          </Link>
        ))}
        <Link href="/tailor/more" className={cn("flex flex-col items-center gap-1 py-2.5 text-xs font-medium", active("/tailor/more") ? "text-ink" : "text-muted")}>
          <LayoutGrid className="size-7" />
          {t("common.more")}
        </Link>
      </div>
    </nav>
  );
}

export function DashMoreGrid() {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {ITEMS.map((it) => (
        <Link key={it.key} href={it.href} className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-paper p-6 text-center text-lg font-medium shadow-soft active:scale-[0.98]">
          <span className="grid size-14 place-items-center rounded-2xl bg-sand text-gold-deep">
            <it.icon className="size-7" />
          </span>
          {it.key === "workshop" ? t("workshop.workshop") : t(`dash.nav.${it.key}`)}
        </Link>
      ))}
    </div>
  );
}
