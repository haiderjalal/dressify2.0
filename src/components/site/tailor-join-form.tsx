"use client";

import { registerTailorAction } from "@/server/actions/auth";
import { useI18n } from "@/i18n/client";
import { ActionForm } from "@/components/forms/action-form";
import { CheckChip, Field, Input, SubmitButton, Toggle } from "@/components/forms/fields";
import { LocationPickerLazy } from "@/components/maps/tailor-map-lazy";
import { Card } from "@/components/ui/card";
import { AUDIENCES, GARMENT_CATEGORIES } from "@/lib/constants";

export function TailorJoinForm({ womenDefault }: { womenDefault: boolean }) {
  const { t, tx } = useI18n();
  return (
    <ActionForm action={registerTailorAction} className="space-y-6">
      <Card className="space-y-4 p-6">
        <h2 className="font-display text-2xl font-medium">{t("tailorJoin.account")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("auth.name")} name="name">
            <Input name="name" required autoComplete="name" />
          </Field>
          <Field label={t("auth.phone")} name="phone">
            <Input name="phone" type="tel" required placeholder={t("auth.phonePlaceholder")} dir="ltr" />
          </Field>
          <Field label={t("auth.email")} name="email">
            <Input name="email" type="email" required dir="ltr" autoComplete="email" />
          </Field>
          <Field label={t("auth.password")} name="password" hint={t("auth.passwordHint")}>
            <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
        </div>
      </Card>

      <Card className="space-y-5 p-6">
        <h2 className="font-display text-2xl font-medium">{t("tailorJoin.shop")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("tailorJoin.shopName")} name="shopName" className="sm:col-span-2">
            <Input name="shopName" required maxLength={120} />
          </Field>
          <Field label={t("tailorJoin.city")} name="city">
            <Input name="city" required defaultValue="Lahore" />
          </Field>
          <Field label={t("tailorJoin.area")} name="area" optional>
            <Input name="area" />
          </Field>
          <Field label={t("tailorJoin.addressLine")} name="addressLine" optional className="sm:col-span-2">
            <Input name="addressLine" />
          </Field>
        </div>
        <Field label={t("tailorJoin.location")} name="lat">
          <LocationPickerLazy />
        </Field>
        <Field label={t("tailorJoin.serves")} name="serves">
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <CheckChip key={a} name="serves[]" value={a} label={tx(`audiences.${a}`)} defaultChecked={womenDefault ? a === "women" : a === "men"} />
            ))}
          </div>
        </Field>
        <Field label={t("tailorJoin.specialties")} name="specialties">
          <div className="flex flex-wrap gap-2">
            {GARMENT_CATEGORIES.map((c) => (
              <CheckChip key={c} name="specialties[]" value={c} label={tx(`categories.${c}`)} defaultChecked={c === "shalwar_kameez"} />
            ))}
          </div>
        </Field>
        <Field label={t("tailorJoin.experience")} name="yearsExperience" className="max-w-40">
          <Input name="yearsExperience" type="number" min={0} max={70} defaultValue={5} required />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle name="isWomenLed" label={t("tailorJoin.womenLed")} hint={t("tailorJoin.womenLedHint")} defaultChecked={womenDefault} />
          <Toggle name="isHomeBased" label={t("tailorJoin.homeBased")} defaultChecked={womenDefault} />
          <Toggle name="offersHomeVisit" label={t("tailorJoin.homeVisit")} />
        </div>
      </Card>

      <SubmitButton size="lg" variant="emerald" className="w-full sm:w-auto">
        {t("tailorJoin.submit")}
      </SubmitButton>
    </ActionForm>
  );
}
