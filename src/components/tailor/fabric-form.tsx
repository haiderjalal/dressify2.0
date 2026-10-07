"use client";

import { useRouter } from "next/navigation";
import { saveFabricAction } from "@/server/actions/tailor";
import { useI18n } from "@/i18n/client";
import { ActionForm } from "@/components/forms/action-form";
import { Field, Input, Select, SubmitButton, Toggle } from "@/components/forms/fields";
import { FABRIC_MATERIALS } from "@/lib/constants";

type Initial = { id: string; name: string; material: string; colorName: string; colorHex: string; pricePerMeter: number; stockMeters: number; isActive: boolean };

export function FabricForm({ initial }: { initial?: Initial }) {
  const { t, tx } = useI18n();
  const router = useRouter();
  return (
    <ActionForm action={saveFabricAction} className="space-y-5" onDone={(s) => s.ok && router.push("/tailor/fabrics")}>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("dash.fabricName")} name="name">
          <Input name="name" size="lg" required defaultValue={initial?.name} />
        </Field>
        <Field label={t("dash.material")} name="material">
          <Select name="material" size="lg" defaultValue={initial?.material ?? "cotton"}>
            {FABRIC_MATERIALS.map((m) => (
              <option key={m} value={m}>
                {tx(`materials.${m}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("dash.colorName")} name="colorName">
          <Input name="colorName" size="lg" required defaultValue={initial?.colorName} />
        </Field>
        <Field label={t("dash.colorHex")} name="colorHex">
          <input type="color" name="colorHex" defaultValue={initial?.colorHex ?? "#d8cfc0"} className="h-14 w-full cursor-pointer rounded-xl border border-line-strong bg-paper p-1" />
        </Field>
        <Field label={t("dash.pricePerMeter")} name="pricePerMeter">
          <Input name="pricePerMeter" size="lg" type="number" inputMode="numeric" min={10} required defaultValue={initial?.pricePerMeter} dir="ltr" />
        </Field>
        <Field label={t("dash.stock")} name="stockMeters">
          <Input name="stockMeters" size="lg" type="number" inputMode="decimal" min={0} step={0.5} required defaultValue={initial?.stockMeters ?? 10} dir="ltr" />
        </Field>
      </div>
      <Field label={t("dash.photos")} name="image" optional hint={t("dash.photosHint")}>
        <Input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="py-2" />
      </Field>
      <Toggle name="isActive" label={t("dash.visible")} defaultChecked={initial?.isActive ?? true} />
      <SubmitButton size="xl" variant="emerald">{t("common.save")}</SubmitButton>
    </ActionForm>
  );
}
