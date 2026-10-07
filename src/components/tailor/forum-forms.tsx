"use client";

import { createPostAction, createReplyAction } from "@/server/actions/tailor";
import { useI18n } from "@/i18n/client";
import { ActionForm } from "@/components/forms/action-form";
import { Field, Input, Select, SubmitButton, Textarea } from "@/components/forms/fields";
import { FORUM_CATEGORIES } from "@/lib/constants";

export function NewPostForm() {
  const { t, tx } = useI18n();
  return (
    <ActionForm action={createPostAction} className="space-y-5 rounded-3xl border border-line bg-paper p-6 shadow-soft">
      <Field label={t("dash.postTitle")} name="title">
        <Input name="title" size="lg" required minLength={4} maxLength={160} />
      </Field>
      <Field label={t("dash.postCategory")} name="category">
        <Select name="category" size="lg" defaultValue="general">
          {FORUM_CATEGORIES.map((c) => (
            <option key={c} value={c}>{tx(`forumCategories.${c}`)}</option>
          ))}
        </Select>
      </Field>
      <Field label={t("dash.postBody")} name="body">
        <Textarea name="body" required minLength={4} maxLength={5000} className="min-h-40 text-lg" />
      </Field>
      <SubmitButton size="xl" variant="emerald">{t("common.submit")}</SubmitButton>
    </ActionForm>
  );
}

export function ReplyForm({ postId }: { postId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={createReplyAction} className="space-y-3 rounded-3xl border border-line bg-paper p-5" resetOnSuccess silent>
      <input type="hidden" name="postId" value={postId} />
      <Textarea name="body" required maxLength={3000} placeholder={t("dash.replyPlaceholder")} className="text-lg" />
      <SubmitButton size="xl" variant="emerald">{t("dash.reply")}</SubmitButton>
    </ActionForm>
  );
}
