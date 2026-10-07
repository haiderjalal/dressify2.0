import Link from "next/link";
import { MessagesSquare, Plus } from "lucide-react";
import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listPosts } from "@/server/modules/forum/service";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { LinkTabs } from "@/components/ui/tabs";
import { FORUM_CATEGORIES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Community" };

export default async function TailorCommunityPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const sp = await searchParams;
  const category = (FORUM_CATEGORIES as readonly string[]).includes(sp.category ?? "") ? sp.category : undefined;
  await requireTailor();
  const { t, tx, locale } = await getI18n();
  const posts = await listPosts(category);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-medium">{t("dash.communityTitle")}</h1>
          <p className="mt-1 max-w-2xl text-lg text-muted">{t("dash.communityHint")}</p>
        </div>
        <LinkButton href="/tailor/community/new" size="xl" variant="emerald">
          <Plus className="size-6" /> {t("dash.newPost")}
        </LinkButton>
      </div>

      <LinkTabs
        size="lg"
        active={category ?? "all"}
        items={[{ key: "all", href: "/tailor/community", label: t("common.all") }, ...FORUM_CATEGORIES.map((c) => ({ key: c, href: `/tailor/community?category=${c}`, label: tx(`forumCategories.${c}`) }))]}
      />

      {posts.length === 0 ? (
        <p className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line-strong bg-paper/60 p-12 text-center text-lg text-muted">
          <MessagesSquare className="size-10 text-gold" /> {t("dash.noPosts")}
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/tailor/community/${p.id}`} className="block rounded-3xl border border-line bg-paper p-5 shadow-soft transition hover:shadow-lift">
              <div className="flex items-center gap-3">
                <Avatar name={p.shopName ?? p.authorName} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.shopName ?? p.authorName}</p>
                  <p className="text-sm text-muted">{formatDate(p.createdAt, locale)}</p>
                </div>
                <Badge tone="gold" className="ms-auto">
                  {tx(`forumCategories.${p.category}`)}
                </Badge>
              </div>
              <h2 className="mt-3 text-xl font-semibold">{p.title}</h2>
              <p className="mt-1 line-clamp-2 text-base text-ink-soft">{p.body}</p>
              <p className="mt-3 text-sm text-muted">{t("dash.replies", { n: p.replyCount })}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
