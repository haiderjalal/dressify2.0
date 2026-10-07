import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { listTailorsByStatus } from "@/server/modules/admin/service";
import { tailorStatusAction } from "@/server/actions/admin";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { LinkTabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { AdminButton } from "@/components/admin/admin-button";
import { formatDate, rating } from "@/lib/utils";

export const metadata = { title: "Tailors · Admin" };

export default async function AdminTailors({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = sp.status === "approved" || sp.status === "suspended" ? sp.status : "pending";
  const { t, tx, locale } = await getI18n();
  const rows = await listTailorsByStatus(status, sp.q?.slice(0, 60));
  return (
    <>
      <PageHeader title={t("admin.tailors")} />
      <LinkTabs
        className="mb-6"
        active={status}
        items={[
          { key: "pending", href: "/admin/tailors?status=pending", label: t("admin.filterPending") },
          { key: "approved", href: "/admin/tailors?status=approved", label: t("admin.filterApproved") },
          { key: "suspended", href: "/admin/tailors?status=suspended", label: t("admin.filterSuspended") },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState title={t("admin.empty")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-soft">
          {rows.map(({ t: tl, ownerName, email }) => (
            <div key={tl.id} className="flex flex-wrap items-center gap-4 border-b border-line p-4 last:border-0">
              <Avatar name={tl.shopName} src={tl.avatarUrl} size={44} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {tl.status === "approved" ? <Link href={`/tailors/${tl.slug}`} className="hover:underline">{tl.shopName}</Link> : tl.shopName}
                  {tl.isWomenLed && <Badge tone="gold">{t("tailor.womenLed")}</Badge>}
                  {tl.isHomeBased && <Badge>{t("tailor.homeBased")}</Badge>}
                </p>
                <p className="truncate text-sm text-muted">
                  {ownerName} · {email} · {[tl.area, tl.city].filter(Boolean).join(", ")}
                </p>
                <p className="truncate text-xs text-faint">
                  {tl.specialties.map((c) => tx(`categories.${c}`)).join(", ")} · {t("admin.joined")} {formatDate(tl.createdAt, locale)}
                  {tl.ratingCount > 0 && ` · ★ ${rating(tl.ratingSum, tl.ratingCount)}`}
                </p>
              </div>
              <div className="flex gap-2">
                {status !== "approved" && <AdminButton action={tailorStatusAction} fields={{ id: tl.id, status: "approved" }} label={status === "pending" ? t("admin.approve") : t("admin.reinstate")} variant="emerald" />}
                {status !== "suspended" && <AdminButton action={tailorStatusAction} fields={{ id: tl.id, status: "suspended" }} label={t("admin.suspend")} variant="danger-outline" confirm />}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
