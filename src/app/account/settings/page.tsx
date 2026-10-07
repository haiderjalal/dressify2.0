import { requireUser } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/ui/card";
import { SettingsForms } from "@/components/account/settings-forms";
import { PushCard } from "@/components/account/push-card";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser("customer");
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t("account.settings")} />
      <SettingsForms name={user.name} email={user.email} phone={user.phone ?? ""} />
      <div className="mt-6 max-w-md">
        <PushCard />
      </div>
    </>
  );
}
