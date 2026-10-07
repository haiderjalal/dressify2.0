"use client";

import { updateShopAction } from "@/server/actions/tailor";
import { useI18n } from "@/i18n/client";
import { ActionForm } from "@/components/forms/action-form";
import { CheckChip, Field, Input, SubmitButton, Textarea, Toggle } from "@/components/forms/fields";
import { LocationPickerLazy } from "@/components/maps/tailor-map-lazy";
import { AUDIENCES, GARMENT_CATEGORIES } from "@/lib/constants";

type Shop = {
  shopName: string;
  bio: string | null;
  phone: string;
  city: string;
  area: string | null;
  addressLine: string | null;
  lat: number;
  lng: number;
  serves: string[];
  specialties: string[];
  yearsExperience: number;
  isHomeBased: boolean;
  isWomenLed: boolean;
  offersHomeVisit: boolean;
};

export function ShopForm({ tailor }: { tailor: Shop }) {
  const { t, tx } = useI18n();
  return (
    <ActionForm action={updateShopAction} className="space-y-6 rounded-3xl border border-line bg-paper p-6 shadow-soft">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("tailorJoin.shopName")} name="shopName" className="sm:col-span-2">
          <Input name="shopName" size="lg" required defaultValue={tailor.shopName} />
        </Field>
        <Field label={t("auth.phone")} name="phone">
          <Input name="phone" size="lg" type="tel" dir="ltr" required defaultValue={tailor.phone} />
        </Field>
        <Field label={t("tailorJoin.experience")} name="yearsExperience">
          <Input name="yearsExperience" size="lg" type="number" min={0} max={70} required defaultValue={tailor.yearsExperience} dir="ltr" />
        </Field>
        <Field label={t("tailorJoin.city")} name="city">
          <Input name="city" size="lg" required defaultValue={tailor.city} />
        </Field>
        <Field label={t("tailorJoin.area")} name="area" optional>
          <Input name="area" size="lg" defaultValue={tailor.area ?? ""} />
        </Field>
        <Field label={t("tailorJoin.addressLine")} name="addressLine" optional className="sm:col-span-2">
          <Input name="addressLine" size="lg" defaultValue={tailor.addressLine ?? ""} />
        </Field>
      </div>
      <Field label={t("dash.bio")} name="bio" optional>
        <Textarea name="bio" defaultValue={tailor.bio ?? ""} maxLength={2000} className="text-lg" />
      </Field>
      <Field label={t("tailorJoin.location")} name="lat">
        <LocationPickerLazy defaultLat={tailor.lat} defaultLng={tailor.lng} />
      </Field>
      <Field label={t("tailorJoin.serves")} name="serves">
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map((a) => (
            <CheckChip key={a} name="serves[]" value={a} label={tx(`audiences.${a}`)} defaultChecked={tailor.serves.includes(a)} />
          ))}
        </div>
      </Field>
      <Field label={t("tailorJoin.specialties")} name="specialties">
        <div className="flex flex-wrap gap-2">
          {GARMENT_CATEGORIES.map((c) => (
            <CheckChip key={c} name="specialties[]" value={c} label={tx(`categories.${c}`)} defaultChecked={tailor.specialties.includes(c)} />
          ))}
        </div>
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Toggle name="isWomenLed" label={t("tailorJoin.womenLed")} defaultChecked={tailor.isWomenLed} />
        <Toggle name="isHomeBased" label={t("tailorJoin.homeBased")} defaultChecked={tailor.isHomeBased} />
        <Toggle name="offersHomeVisit" label={t("tailorJoin.homeVisit")} defaultChecked={tailor.offersHomeVisit} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("dash.avatar")} name="avatar" optional hint={t("dash.photosHint")}>
          <Input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" className="py-2" />
        </Field>
        <Field label={t("dash.cover")} name="cover" optional hint={t("dash.photosHint")}>
          <Input type="file" name="cover" accept="image/jpeg,image/png,image/webp" className="py-2" />
        </Field>
      </div>
      <SubmitButton size="xl" variant="emerald">{t("common.save")}</SubmitButton>
    </ActionForm>
  );
}
