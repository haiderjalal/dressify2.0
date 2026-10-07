import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { tailorStats } from "@/server/modules/orders/service";
import { Logo } from "@/components/shell/logo";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { NotificationBell } from "@/components/shell/notification-bell";
import { DashBottomNav, DashSidebar } from "@/components/tailor/dash-nav";
import { Avatar } from "@/components/ui/avatar";

/**
 * Tailor dashboard shell — designed for 30–50 year-old users on phones:
 * 17–18px base text, 56px touch targets, icons with labels, one primary action per screen.
 */
export default async function TailorLayout({ children }: { children: React.ReactNode }) {
  const { tailor } = await requireTailor();
  const [{ t }, stats] = await Promise.all([getI18n(), tailorStats(tailor.id)]);
  return (
    <div className="atelier-app min-h-dvh text-[17px]">
      <a href="#tailor-content" className="skip-link">{t("common.continue")}</a>
      <header className="atelier-header no-print sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 lg:px-6">
          <Logo href="/tailor" className="hidden sm:inline-flex" />
          <Link href="/tailor/shop" className="flex min-w-0 items-center gap-2.5 sm:hidden">
            <Avatar name={tailor.shopName} src={tailor.avatarUrl} size={36} />
            <span className="truncate font-semibold">{tailor.shopName}</span>
          </Link>
          <div className="ms-auto flex items-center gap-2">
            <LanguageToggle large className="h-11" />
            <NotificationBell href="/tailor/notifications" large />
          </div>
        </div>
      </header>

      {tailor.status !== "approved" && (
        <div className={tailor.status === "suspended" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}>
          <p className="mx-auto max-w-7xl px-4 py-3 text-base font-medium lg:px-6">{tailor.status === "suspended" ? t("tailorJoin.suspended") : t("tailorJoin.pending")}</p>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl gap-8 px-4 pt-6 pb-28 lg:px-6 lg:pb-12">
        <aside className="atelier-sidebar no-print hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24 space-y-6">
            <Link href="/tailor/shop" className="flex items-center gap-3 rounded-2xl bg-paper p-3 shadow-soft">
              <Avatar name={tailor.shopName} src={tailor.avatarUrl} size={44} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{tailor.shopName}</span>
                <span className="block truncate text-sm text-muted">{tailor.area ?? tailor.city}</span>
              </span>
            </Link>
            <DashSidebar newOrders={stats.newOrders} />
            {tailor.status === "approved" && (
              <Link href={`/tailors/${tailor.slug}`} target="_blank" className="flex items-center gap-2 px-4 text-sm text-muted hover:text-ink">
                <ExternalLink className="size-4" /> {t("dash.nav.viewShop")}
              </Link>
            )}
          </div>
        </aside>
        <main id="tailor-content" className="min-w-0 flex-1">{children}</main>
      </div>
      <DashBottomNav newOrders={stats.newOrders} />
    </div>
  );
}
