import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { DesignForm } from "@/components/tailor/design-form";

export const metadata = { title: "Add design" };

export default async function NewDesign() {
  await requireTailor();
  const { t } = await getI18n();
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-display text-4xl font-medium">{t("dash.addDesign")}</h1>
      <DesignForm />
    </div>
  );
}
