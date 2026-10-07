import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listCustomerAppointments } from "@/server/modules/appointments/service";
import { customerAppointmentAction } from "@/server/actions/account";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { SimpleActionButton } from "@/components/account/address-form";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Appointments" };

export default async function CustomerAppointments() {
  const user = await requireUser("customer");
  const { t, locale } = await getI18n();
  const rows = await listCustomerAppointments(user.id);
  return (
    <>
      <PageHeader title={t("appointments.title")} subtitle={t("appointments.subtitle")} />
      {rows.length === 0 ? (
        <EmptyState icon={<CalendarDays />} title={t("appointments.empty")} action={<LinkButton href="/explore" size="sm">{t("home.ctaExplore")}</LinkButton>} />
      ) : (
        <div className="space-y-3">
          {rows.map(({ a, shopName, slug, phone }) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <Link href={`/tailors/${slug}`} className="font-medium hover:underline">{shopName}</Link>
                <p className="text-sm text-muted">
                  {formatDateTime(a.scheduledAt, locale)} · {t(`appointments.types.${a.type}`)} · {t(`appointments.modes.${a.mode}`)}
                </p>
                {phone && <p className="text-sm text-muted" dir="ltr">{phone}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={a.status === "confirmed" ? "success" : a.status === "cancelled" ? "danger" : a.status === "completed" ? "dark" : "gold"}>{t(`appointments.statuses.${a.status}`)}</Badge>
                {(a.status === "requested" || a.status === "confirmed") && <SimpleActionButton action={customerAppointmentAction} id={a.id} label={t("appointments.cancel")} variant="danger-outline" />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
