import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listNotifications } from "@/server/modules/notifications/service";
import { NotificationList } from "@/components/notifications/notification-list";

export const metadata = { title: "Notifications" };

export default async function TailorNotifications() {
  const { user } = await requireTailor();
  const i18n = await getI18n();
  const items = await listNotifications(user.id, 50);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-medium">{i18n.t("notifications.title")}</h1>
      <NotificationList t={i18n} items={items} large />
    </div>
  );
}
