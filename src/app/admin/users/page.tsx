import { Search } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listUsers } from "@/server/modules/admin/service";
import { userActiveAction } from "@/server/actions/admin";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { LinkTabs } from "@/components/ui/tabs";
import { AdminButton } from "@/components/admin/admin-button";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Users · Admin" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const sp = await searchParams;
  const me = await requireUser("admin");
  const role = sp.role === "customer" || sp.role === "tailor" || sp.role === "admin" ? sp.role : undefined;
  const { t, tx, locale } = await getI18n();
  const rows = await listUsers(sp.q?.slice(0, 60), role);
  const qs = (r?: string) => `/admin/users?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(r ? { role: r } : {}) })}`;
  return (
    <>
      <PageHeader title={t("admin.users")} />
      <form className="relative mb-4 max-w-md">
        {role && <input type="hidden" name="role" value={role} />}
        <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input name="q" defaultValue={sp.q} placeholder={t("admin.searchUsers")} className="h-11 w-full rounded-full border border-line-strong bg-paper ps-11 pe-4 text-sm focus:outline-none" />
      </form>
      <LinkTabs
        className="mb-6"
        active={role ?? "all"}
        items={[
          { key: "all", href: qs(), label: t("common.all") },
          { key: "customer", href: qs("customer"), label: t("roles.customer") },
          { key: "tailor", href: qs("tailor"), label: t("roles.tailor") },
          { key: "admin", href: qs("admin"), label: t("roles.admin") },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState title={t("admin.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper shadow-soft">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-sand/40 text-xs text-muted">
              <tr>
                <th className="px-4 py-3 text-start">{t("account.name")}</th>
                <th className="px-4 py-3 text-start">{t("account.email")}</th>
                <th className="px-4 py-3 text-start">{t("admin.role")}</th>
                <th className="px-4 py-3 text-start">{t("admin.joined")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((u) => (
                <tr key={u.id} className={u.isActive ? "" : "opacity-60"}>
                  <td className="px-4 py-3 font-medium">{u.name}<div className="text-xs font-normal text-muted" dir="ltr">{u.phone}</div></td>
                  <td className="px-4 py-3" dir="ltr">{u.email}</td>
                  <td className="px-4 py-3"><Badge tone={u.role === "admin" ? "dark" : u.role === "tailor" ? "emerald" : "neutral"}>{tx(`roles.${u.role}`)}</Badge></td>
                  <td className="px-4 py-3 text-muted">{formatDate(u.createdAt, locale)}</td>
                  <td className="px-4 py-3 text-end">
                    {u.id !== me.id && (u.isActive ? <AdminButton action={userActiveAction} fields={{ id: u.id, active: "false" }} label={t("admin.deactivate")} variant="danger-outline" confirm /> : <AdminButton action={userActiveAction} fields={{ id: u.id, active: "true" }} label={t("admin.activate")} variant="outline" />)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
