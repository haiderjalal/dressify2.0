import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { getCurrentUser, homeFor } from "@/server/auth/session";
import { Logo } from "./logo";
import { LanguageToggle } from "./language-toggle";
import { NotificationBell } from "./notification-bell";
import { MobileMenu } from "./mobile-menu";
import { LinkButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

export async function SiteHeader() {
  const [{ t }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const links = [
    { href: "/explore", label: t("nav.explore") },
    { href: "/explore?women=1", label: t("nav.herCraft") },
    { href: "/try-on", label: t("tryon.title") },
    { href: "/join/tailor", label: t("nav.forTailors") },
  ];
  const home = user ? homeFor(user.role) : "/login";
  const bellHref = user?.role === "tailor" ? "/tailor/notifications" : user?.role === "admin" ? "/admin" : "/account/notifications";

  return (
    <header className="site-header sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur-md">
      <div className="container-x flex h-20 items-center gap-6">
        <Logo />
        <nav className="hidden flex-1 items-center gap-7 text-sm text-ink-soft lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <LanguageToggle className="hidden sm:inline-flex" />
          {user ? (
            <>
              <NotificationBell href={bellHref} />
              <Link href={home} className="flex items-center gap-2 rounded-full py-1 ps-1 pe-3 transition-colors hover:bg-sand" title={user.name}>
                <Avatar name={user.name} src={user.avatarUrl} size={32} />
                <span className="hidden max-w-32 truncate text-sm font-medium md:inline">
                  {user.role === "customer" ? t("nav.account") : user.role === "tailor" ? t("nav.tailorDashboard") : t("nav.admin")}
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden px-3 text-sm font-medium text-ink-soft hover:text-ink sm:inline">
                {t("common.signIn")}
              </Link>
              <LinkButton href="/register" size="sm" className="hidden sm:inline-flex">
                {t("common.signUp")}
              </LinkButton>
            </>
          )}
          <MobileMenu links={links} signedIn={Boolean(user)} home={home} labels={{ menu: t("common.menu"), signIn: t("common.signIn"), signUp: t("common.signUp"), account: t("nav.account") }} />
        </div>
      </div>
    </header>
  );
}
