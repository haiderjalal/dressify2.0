import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { Logo } from "@/components/shell/logo";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { AdminNav } from "@/components/admin/admin-nav";
import { logoutAction } from "@/server/actions/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser("admin", "/admin");
  const { t } = await getI18n();
  const items = [
    { href: "/admin", label: t("admin.overview") },
    { href: "/admin/tailors", label: t("admin.tailors") },
    { href: "/admin/orders", label: t("admin.orders") },
    { href: "/admin/users", label: t("admin.users") },
    { href: "/admin/community", label: t("admin.community") },
  ];
  return (
    <div className="min-h-dvh bg-ivory">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="container-x flex h-16 items-center gap-3 sm:gap-6">
          <Logo href="/admin" />
          <span className="hidden rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-paper sm:inline">{t("admin.title")}</span>
          <div className="ms-auto flex items-center gap-3">
            <Link href="/" className="hidden text-sm text-muted hover:text-ink sm:inline">{t("common.appName")} ↗</Link>
            <LanguageToggle />
            <form action={logoutAction}>
              <button className="text-sm text-danger hover:underline">{t("common.signOut")}</button>
            </form>
          </div>
        </div>
        <div className="container-x pb-3">
          <AdminNav items={items} />
        </div>
      </header>
      <main className="app-content container-x py-8">{children}</main>
    </div>
  );
}
