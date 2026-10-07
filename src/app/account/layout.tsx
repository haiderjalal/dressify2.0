import { requireUser } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { SiteHeader } from "@/components/shell/site-header";
import { SiteFooter } from "@/components/shell/site-footer";
import { AccountNav } from "@/components/account/account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser("customer", "/account");
  const { t } = await getI18n();
  const items = [
    { href: "/account", label: t("account.title"), key: "home" },
    { href: "/account/orders", label: t("account.orders"), key: "orders" },
    { href: "/account/measurements", label: t("account.measurements"), key: "measurements" },
    { href: "/account/appointments", label: t("account.appointments"), key: "appointments" },
    { href: "/account/addresses", label: t("account.addresses"), key: "addresses" },
    { href: "/account/saved", label: t("account.saved"), key: "saved" },
    { href: "/account/settings", label: t("account.settings"), key: "settings" },
  ];
  return (
    <>
      <SiteHeader />
      <div className="border-b border-line bg-paper/60">
        <div className="container-x py-3">
          <AccountNav items={items} />
        </div>
      </div>
      <main className="app-content container-x py-8 lg:py-10">{children}</main>
      <SiteFooter />
    </>
  );
}
