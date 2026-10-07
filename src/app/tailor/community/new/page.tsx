import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { NewPostForm } from "@/components/tailor/forum-forms";

export default async function NewPost() {
  await requireTailor();
  const { t } = await getI18n();
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-display text-4xl font-medium">{t("dash.newPost")}</h1>
      <NewPostForm />
    </div>
  );
}
