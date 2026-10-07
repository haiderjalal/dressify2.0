import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { getAvailability } from "@/server/modules/tailors/availability";
import { CapacityForm, DayOverride } from "@/components/tailor/availability-forms";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Slots" };

export default async function AvailabilityPage() {
  const { tailor } = await requireTailor();
  const { t, locale } = await getI18n();
  const days = await getAvailability(tailor, 14);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl font-medium">{t("dash.availabilityTitle")}</h1>
        <p className="mt-1 text-lg text-muted">{t("dash.availabilityHint")}</p>
      </div>
      <CapacityForm dailyCapacity={tailor.dailyCapacity} workingDays={tailor.workingDays} />
      <section>
        <h2 className="mb-4 text-2xl font-semibold">{t("dash.upcoming")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {days.map((d) => (
            <div key={d.day} className={cn("flex items-center gap-4 rounded-3xl border bg-paper p-4 shadow-soft", d.closed ? "border-line opacity-70" : d.available === 0 ? "border-danger/30" : "border-line")}>
              <div className="w-16 text-center">
                <p className="text-sm text-muted">{formatDate(d.day, locale, { weekday: "short" })}</p>
                <p className="text-3xl font-semibold">{formatDate(d.day, "en", { day: "numeric" })}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-lg font-medium", d.closed ? "text-muted" : d.available === 0 ? "text-danger" : "text-emerald")}>
                  {d.closed ? t("tailor.closed") : d.available === 0 ? t("tailor.full") : t("tailor.slotsLeft", { n: d.available })}
                </p>
                <p className="text-sm text-muted">{t("dash.booked", { used: d.used, cap: d.capacity })}</p>
              </div>
              <DayOverride day={d.day} capacity={d.capacity} closed={d.closed} openWith={tailor.dailyCapacity} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
