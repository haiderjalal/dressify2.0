import { notFound } from "next/navigation";
import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { getDesign } from "@/server/modules/catalog/service";
import { DesignForm } from "@/components/tailor/design-form";

export const metadata = { title: "Edit design" };

export default async function EditDesign({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { tailor } = await requireTailor();
  const design = await getDesign(tailor.id, id);
  if (!design) notFound();
  const { t } = await getI18n();
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-display text-4xl font-medium">{t("dash.editDesign")}</h1>
      <DesignForm initial={design} />
    </div>
  );
}
