import { CalendarClock, Phone } from "lucide-react";
import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listTailorAppointments } from "@/server/modules/appointments/service";
import { tailorAppointmentAction } from "@/server/actions/tailor";
import { Badge } from "@/components/ui/card";
import { SimpleActionButton } from "@/components/account/address-form";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Appointments" };

export default async function TailorAppointments() {
  const { tailor } = await requireTailor();
  const { t, locale } = await getI18n();
  const rows = await listTailorAppointments(tailor.id);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-medium">{t("dash.appointmentsTitle")}</h1>
      {rows.length === 0 ? (
        <p className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line-strong bg-paper/60 p-12 text-center text-lg text-muted">
          <CalendarClock className="size-10 text-gold" /> {t("appointments.empty")}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map(({ a, customerName, customerPhone }) => (
            <div key={a.id} className="rounded-3xl border border-line bg-paper p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold">{customerName}</p>
                  <p className="text-lg text-ink-soft">{formatDateTime(a.scheduledAt, locale)}</p>
                  <p className="text-base text-muted">
                    {t(`appointments.types.${a.type}`)} · {t(`appointments.modes.${a.mode}`)}
                  </p>
                  {a.addressText && <p className="text-base text-muted">{a.addressText}</p>}
                  {a.notes && <p className="mt-2 rounded-2xl bg-sand/50 px-3 py-2 text-base">{a.notes}</p>}
                </div>
                <Badge tone={a.status === "confirmed" ? "success" : a.status === "cancelled" ? "danger" : a.status === "completed" ? "dark" : "gold"} className="text-sm">
                  {t(`appointments.statuses.${a.status}`)}
                </Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {customerPhone && (
                  <a href={`tel:${customerPhone}`} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-line px-4 text-base">
                    <Phone className="size-5" /> {t("dash.customerPhone")}
                  </a>
                )}
                {a.status === "requested" && (
                  <>
                    <SimpleActionButton action={tailorAppointmentAction} id={a.id} extra={{ action: "confirm" }} label={t("appointments.confirm")} variant="emerald" size="lg" />
                    <SimpleActionButton action={tailorAppointmentAction} id={a.id} extra={{ action: "decline" }} label={t("appointments.decline")} variant="danger-outline" size="lg" />
                  </>
                )}
                {a.status === "confirmed" && <SimpleActionButton action={tailorAppointmentAction} id={a.id} extra={{ action: "complete" }} label={t("appointments.complete")} variant="outline" size="lg" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
