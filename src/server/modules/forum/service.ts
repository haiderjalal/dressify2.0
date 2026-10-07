import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { forumPosts, forumReplies, tailorProfiles, users } from "@/server/db/schema";
import { notFound } from "@/server/lib/errors";
import { notify } from "@/server/modules/notifications/service";

const author = { authorName: users.name, shopName: tailorProfiles.shopName, authorRole: users.role };

export function listPosts(category?: string, limit = 50) {
  return db
    .select({ id: forumPosts.id, title: forumPosts.title, body: forumPosts.body, category: forumPosts.category, replyCount: forumPosts.replyCount, lastActivityAt: forumPosts.lastActivityAt, createdAt: forumPosts.createdAt, ...author })
    .from(forumPosts)
    .innerJoin(users, eq(users.id, forumPosts.authorId))
    .leftJoin(tailorProfiles, eq(tailorProfiles.userId, users.id))
    .where(and(eq(forumPosts.isDeleted, false), category ? eq(forumPosts.category, category) : undefined))
    .orderBy(desc(forumPosts.lastActivityAt))
    .limit(limit);
}

export async function getPost(id: string) {
  const [post] = await db
    .select({ id: forumPosts.id, authorId: forumPosts.authorId, title: forumPosts.title, body: forumPosts.body, category: forumPosts.category, replyCount: forumPosts.replyCount, createdAt: forumPosts.createdAt, ...author })
    .from(forumPosts)
    .innerJoin(users, eq(users.id, forumPosts.authorId))
    .leftJoin(tailorProfiles, eq(tailorProfiles.userId, users.id))
    .where(and(eq(forumPosts.id, id), eq(forumPosts.isDeleted, false)))
    .limit(1);
  if (!post) return null;
  const replies = await db
    .select({ id: forumReplies.id, body: forumReplies.body, createdAt: forumReplies.createdAt, authorId: forumReplies.authorId, ...author })
    .from(forumReplies)
    .innerJoin(users, eq(users.id, forumReplies.authorId))
    .leftJoin(tailorProfiles, eq(tailorProfiles.userId, users.id))
    .where(and(eq(forumReplies.postId, id), eq(forumReplies.isDeleted, false)))
    .orderBy(asc(forumReplies.createdAt))
    .limit(300);
  return { post, replies };
}

export async function createPost(authorId: string, input: { title: string; body: string; category: string }) {
  const [p] = await db.insert(forumPosts).values({ ...input, authorId }).returning({ id: forumPosts.id });
  return p.id;
}

export async function createReply(authorId: string, postId: string, body: string) {
  const [post] = await db
    .update(forumPosts)
    .set({ replyCount: sql`${forumPosts.replyCount} + 1`, lastActivityAt: new Date() })
    .where(and(eq(forumPosts.id, postId), eq(forumPosts.isDeleted, false)))
    .returning({ authorId: forumPosts.authorId, title: forumPosts.title });
  if (!post) throw notFound();
  await db.insert(forumReplies).values({ postId, authorId, body });
  if (post.authorId !== authorId) {
    const [a] = await db.select({ name: users.name }).from(users).where(eq(users.id, authorId));
    await notify(post.authorId, "forum_reply", { author: a.name, title: post.title.slice(0, 60) }, `/tailor/community/${postId}`);
  }
}

export async function removePost(postId: string) {
  await db.update(forumPosts).set({ isDeleted: true }).where(eq(forumPosts.id, postId));
}
