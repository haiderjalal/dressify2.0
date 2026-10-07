"use client";

import { useState } from "react";
import { saveMeasurementAction } from "@/server/actions/account";
import { useI18n } from "@/i18n/client";
import { ActionForm, type ActionState } from "@/components/forms/action-form";
import { Field, Input, SubmitButton, Textarea } from "@/components/forms/fields";
import { AUDIENCES, MEASUREMENT_FIELDS, type Audience } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type MeasurementInitial = { id?: string; name?: string; gender?: string; values?: Record<string, number>; notes?: string | null };

export function MeasurementForm({ initial, onSaved, compact }: { initial?: MeasurementInitial; onSaved?: (id: string) => void; compact?: boolean }) {
  const { t, tx } = useI18n();
  const [gender, setGender] = useState<Audience>((initial?.gender as Audience) ?? "women");
  return (
    <ActionForm
      action={saveMeasurementAction}
      className="space-y-5"
      onDone={(s: NonNullable<ActionState>) => {
        if (s.ok && onSaved) onSaved((s.data as { id: string }).id);
      }}
    >
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("measurements.name")} name="name">
          <Input name="name" required maxLength={60} defaultValue={initial?.name} placeholder={t("measurements.namePlaceholder")} />
        </Field>
        <Field label={t("measurements.gender")} name="gender">
          <div className="flex gap-2">
            {AUDIENCES.map((a) => (
              <label key={a} className="flex-1 cursor-pointer">
                <input type="radio" name="gender" value={a} checked={gender === a} onChange={() => setGender(a)} className="peer sr-only" />
                <span className="block rounded-xl border border-line-strong py-2.5 text-center text-sm transition peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper">{tx(`audiences.${a}`)}</span>
              </label>
            ))}
          </div>
        </Field>
      </div>
      <p className="rounded-xl bg-sand/60 px-4 py-3 text-xs text-muted">{t("measurements.howTo")}</p>
      <Field name="values">
        <div className={cn("grid gap-3", compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}>
          {MEASUREMENT_FIELDS[gender].map((f) => (
            <label key={f} className="block">
              <span className="mb-1 block text-xs font-medium text-ink-soft">{tx(`measurements.fields.${f}`)}</span>
              <div className="relative">
                <input
                  type="number"
                  name={`m_${f}`}
                  inputMode="decimal"
                  step={0.25}
                  min={1}
                  max={120}
                  defaultValue={initial?.values?.[f] ?? ""}
                  className="h-11 w-full rounded-xl border border-line-strong bg-paper ps-3 pe-9 tabular-nums focus:border-ink/60 focus:ring-4 focus:ring-gold/15 focus:outline-none"
                />
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-faint">in</span>
              </div>
            </label>
          ))}
        </div>
      </Field>
      <Field label={t("measurements.notes")} name="notes" optional>
        <Textarea name="notes" defaultValue={initial?.notes ?? ""} placeholder={t("measurements.notesPlaceholder")} maxLength={500} className="min-h-16" />
      </Field>
      <SubmitButton>{t("common.save")}</SubmitButton>
    </ActionForm>
  );
}
