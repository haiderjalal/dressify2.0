import { getI18n } from "@/i18n/server";
import { listPosts } from "@/server/modules/forum/service";
import { removePostAction } from "@/server/actions/admin";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { AdminButton } from "@/components/admin/admin-button";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Community · Admin" };

export default async function AdminCommunity() {
  const { t, tx, locale } = await getI18n();
  const posts = await listPosts(undefined, 100);
  return (
    <>
      <PageHeader title={t("admin.community")} />
      {posts.length === 0 ? (
        <EmptyState title={t("admin.empty")} />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-start gap-4 rounded-2xl border border-line bg-paper p-4 shadow-soft">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">
                  <Badge tone="gold">{tx(`forumCategories.${p.category}`)}</Badge> {p.shopName ?? p.authorName} · {formatDate(p.createdAt, locale)} · {t("dash.replies", { n: p.replyCount })}
                </p>
                <p className="mt-1 font-medium">{p.title}</p>
                <p className="line-clamp-2 text-sm text-muted">{p.body}</p>
              </div>
              <AdminButton action={removePostAction} fields={{ id: p.id }} label={t("admin.removePost")} variant="danger-outline" confirm />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
