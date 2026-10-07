"use client";

import { useState } from "react";
import { capacityAction, dayOverrideAction } from "@/server/actions/tailor";
import { useI18n } from "@/i18n/client";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/fields";
import { Minus, Plus } from "lucide-react";

export function CapacityForm({ dailyCapacity, workingDays }: { dailyCapacity: number; workingDays: number[] }) {
  const { t, tx } = useI18n();
  const [cap, setCap] = useState(dailyCapacity);
  return (
    <ActionForm action={capacityAction} className="space-y-6 rounded-3xl border border-line bg-paper p-6 shadow-soft">
      <div>
        <p className="mb-3 text-lg font-semibold">{t("dash.dailySlots")}</p>
        <div className="inline-flex items-center gap-4">
          <button type="button" onClick={() => setCap((c) => Math.max(0, c - 1))} className="grid size-14 place-items-center rounded-2xl border border-line-strong bg-paper active:scale-95" aria-label="-">
            <Minus className="size-6" />
          </button>
          <span className="w-16 text-center text-5xl font-semibold tabular-nums">{cap}</span>
          <button type="button" onClick={() => setCap((c) => Math.min(50, c + 1))} className="grid size-14 place-items-center rounded-2xl border border-line-strong bg-paper active:scale-95" aria-label="+">
            <Plus className="size-6" />
          </button>
        </div>
        <input type="hidden" name="dailyCapacity" value={cap} />
      </div>
      <div>
        <p className="mb-3 text-lg font-semibold">{t("dash.workingDays")}</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <label key={d} className="cursor-pointer">
              <input type="checkbox" name="workingDays[]" value={d} defaultChecked={workingDays.includes(d)} className="peer sr-only" />
              <span className="inline-flex min-h-12 min-w-16 items-center justify-center rounded-2xl border-2 border-line-strong px-4 text-base font-medium transition peer-checked:border-emerald peer-checked:bg-emerald peer-checked:text-paper">{tx(`weekdays.${d}`)}</span>
            </label>
          ))}
        </div>
      </div>
      <SubmitButton size="xl" variant="emerald">{t("common.save")}</SubmitButton>
    </ActionForm>
  );
}

export function DayOverride({ day, capacity, closed, openWith }: { day: string; capacity: number; closed: boolean; openWith: number }) {
  const { t } = useI18n();
  return (
    <ActionForm action={dayOverrideAction} silent className="flex items-center gap-2">
      <input type="hidden" name="day" value={day} />
      {closed ? (
        <SubmitButton name="capacity" value={String(Math.max(1, openWith))} variant="outline" size="md">
          {t("dash.openDay")}
        </SubmitButton>
      ) : (
        <>
          <select name="capacity" defaultValue={capacity} className="h-11 rounded-xl border border-line-strong bg-paper px-2 text-base" aria-label={t("dash.dailySlots")} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
            {Array.from({ length: Math.max(capacity, 10) + 1 }, (_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <SubmitButton name="capacity" value="0" variant="ghost" size="md" className="text-danger">
            {t("dash.closeDay")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
