import { requireUser } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listNotifications } from "@/server/modules/notifications/service";
import { PageHeader } from "@/components/ui/card";
import { NotificationList } from "@/components/notifications/notification-list";

export const metadata = { title: "Notifications" };

export default async function CustomerNotifications() {
  const user = await requireUser("customer");
  const i18n = await getI18n();
  const items = await listNotifications(user.id, 50);
  return (
    <>
      <PageHeader title={i18n.t("notifications.title")} />
      <NotificationList t={i18n} items={items} />
    </>
  );
}
