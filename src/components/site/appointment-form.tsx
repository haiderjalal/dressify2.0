"use client";

import Link from "next/link";
import { useState } from "react";
import { requestAppointmentAction } from "@/server/actions/account";
import { useI18n } from "@/i18n/client";
import { ActionForm } from "@/components/forms/action-form";
import { Field, Input, Select, SubmitButton, Textarea } from "@/components/forms/fields";
import { buttonClass } from "@/components/ui/button";

export function AppointmentForm({ tailorId, homeVisit, signedIn, loginNext }: { tailorId: string; homeVisit: boolean; signedIn: boolean; loginNext: string }) {
  const { t } = useI18n();
  const [mode, setMode] = useState("at_shop");
  if (!signedIn)
    return (
      <Link href={`/login?next=${encodeURIComponent(loginNext)}`} className={buttonClass("outline", "md", "mt-4 w-full")}>
        {t("common.signIn")}
      </Link>
    );
  const min = new Date(Date.now() + 2 * 3600_000 + 5 * 3600_000).toISOString().slice(0, 16);
  return (
    <ActionForm action={requestAppointmentAction} className="mt-4 space-y-3" resetOnSuccess>
      <input type="hidden" name="tailorId" value={tailorId} />
      <Field label={t("appointments.when")} name="when">
        <Input type="datetime-local" name="when" required min={min} step={900} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("appointments.type")} name="type">
          <Select name="type" defaultValue="measurement">
            <option value="measurement">{t("appointments.types.measurement")}</option>
            <option value="consultation">{t("appointments.types.consultation")}</option>
            <option value="fitting">{t("appointments.types.fitting")}</option>
          </Select>
        </Field>
        <Field label={t("appointments.mode")} name="mode">
          <Select name="mode" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="at_shop">{t("appointments.modes.at_shop")}</option>
            {homeVisit && <option value="home_visit">{t("appointments.modes.home_visit")}</option>}
          </Select>
        </Field>
      </div>
      {mode === "home_visit" && (
        <Field label={t("appointments.address")} name="addressText">
          <Input name="addressText" required maxLength={240} />
        </Field>
      )}
      <Field label={t("appointments.notes")} name="notes" optional>
        <Textarea name="notes" rows={2} maxLength={500} className="min-h-16" />
      </Field>
      <SubmitButton variant="outline" className="w-full">
        {t("appointments.request")}
      </SubmitButton>
    </ActionForm>
  );
}
