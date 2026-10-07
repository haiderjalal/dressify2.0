import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { getPost } from "@/server/modules/forum/service";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/card";
import { ReplyForm } from "@/components/tailor/forum-forms";
import { formatDateTime } from "@/lib/utils";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireTailor();
  const data = await getPost(id);
  if (!data) notFound();
  const { t, tx, locale } = await getI18n();
  const { post, replies } = data;
  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/tailor/community" className="inline-flex items-center gap-2 text-base text-muted hover:text-ink">
        <ArrowLeft className="size-5 rtl:rotate-180" /> {t("dash.communityTitle")}
      </Link>
      <article className="rounded-3xl border border-line bg-paper p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <Avatar name={post.shopName ?? post.authorName} size={44} />
          <div>
            <p className="font-semibold">{post.shopName ?? post.authorName}</p>
            <p className="text-sm text-muted">{formatDateTime(post.createdAt, locale)}</p>
          </div>
          <Badge tone="gold" className="ms-auto">{tx(`forumCategories.${post.category}`)}</Badge>
        </div>
        <h1 className="mt-5 text-2xl font-semibold">{post.title}</h1>
        <p className="mt-3 text-lg leading-relaxed whitespace-pre-wrap text-ink-soft">{post.body}</p>
      </article>
      <h2 className="text-xl font-semibold">{t("dash.replies", { n: replies.length })}</h2>
      <div className="space-y-3">
        {replies.map((r) => (
          <div key={r.id} className="rounded-3xl border border-line bg-paper p-5">
            <div className="flex items-center gap-3">
              <Avatar name={r.shopName ?? r.authorName} size={36} />
              <p className="font-medium">{r.shopName ?? r.authorName}</p>
              <p className="ms-auto text-sm text-muted">{formatDateTime(r.createdAt, locale)}</p>
            </div>
            <p className="mt-3 text-lg whitespace-pre-wrap">{r.body}</p>
          </div>
        ))}
      </div>
      <ReplyForm postId={post.id} />
    </div>
  );
}
