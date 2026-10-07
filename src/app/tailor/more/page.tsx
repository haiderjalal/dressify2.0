import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { DashMoreGrid } from "@/components/tailor/dash-nav";
import { logoutAction } from "@/server/actions/auth";
import { LogOut } from "lucide-react";

export default async function MorePage() {
  await requireTailor();
  const { t } = await getI18n();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-medium">{t("common.menu")}</h1>
      <DashMoreGrid />
      <form action={logoutAction}>
        <button type="submit" className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-danger/30 text-lg font-medium text-danger">
          <LogOut className="size-5" /> {t("common.signOut")}
        </button>
      </form>
    </div>
  );
}
