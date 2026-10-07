"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { deleteDesignAction, saveDesignAction } from "@/server/actions/tailor";
import { useI18n } from "@/i18n/client";
import { ActionForm } from "@/components/forms/action-form";
import { Field, Input, Select, SubmitButton, Textarea, Toggle } from "@/components/forms/fields";
import { DeleteButton } from "@/components/forms/delete-button";
import { AUDIENCES, GARMENT_CATEGORIES } from "@/lib/constants";

type Initial = { id: string; title: string; description: string | null; category: string; audience: string; price: number; durationDays: number; isActive: boolean; images: string[]; tryOnUrl: string | null };

export function DesignForm({ initial }: { initial?: Initial }) {
  const { t, tx } = useI18n();
  const [previews, setPreviews] = useState<string[]>([]);
  return (
    <div className="space-y-4">
      <ActionForm action={saveDesignAction} className="space-y-5 rounded-3xl border border-line bg-paper p-6 shadow-soft">
        {initial && <input type="hidden" name="id" value={initial.id} />}
        <Field label={t("dash.designTitle")} name="title">
          <Input name="title" size="lg" required defaultValue={initial?.title} maxLength={120} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("dash.category")} name="category">
            <Select name="category" size="lg" defaultValue={initial?.category ?? "shalwar_kameez"}>
              {GARMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {tx(`categories.${c}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("dash.audience")} name="audience">
            <Select name="audience" size="lg" defaultValue={initial?.audience ?? "men"}>
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>
                  {tx(`audiences.${a}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("dash.price")} name="price">
            <Input name="price" size="lg" type="number" inputMode="numeric" min={100} required defaultValue={initial?.price} dir="ltr" />
          </Field>
          <Field label={t("dash.duration")} name="durationDays">
            <Input name="durationDays" size="lg" type="number" inputMode="numeric" min={1} max={90} required defaultValue={initial?.durationDays ?? 5} dir="ltr" />
          </Field>
        </div>
        <Field label={t("dash.description")} name="description" optional>
          <Textarea name="description" defaultValue={initial?.description ?? ""} maxLength={1500} className="text-lg" />
        </Field>
        <Field label={t("dash.photos")} name="photos" hint={t("dash.photosHint")}>
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-ivory p-4 text-base text-muted hover:border-gold">
            <ImagePlus className="size-8 text-gold" />
            {t("common.choosePhotos")}
            <input
              type="file"
              name="photos"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => setPreviews(Array.from(e.target.files ?? []).slice(0, 6).map((f) => URL.createObjectURL(f)))}
            />
          </label>
          {(previews.length > 0 || (initial?.images.length ?? 0) > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[...previews, ...(initial?.images ?? [])].slice(0, 6).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="size-20 rounded-xl border border-line object-cover" />
              ))}
            </div>
          )}
        </Field>
        <Field label={t("dash.tryOnImage")} name="tryOn" hint={t("dash.tryOnHint")}>
          <Input type="file" name="tryOn" accept="image/png" className="py-2" />
        </Field>
        <Toggle name="isActive" label={t("dash.visible")} defaultChecked={initial?.isActive ?? true} />
        <SubmitButton size="xl" variant="emerald" className="w-full sm:w-auto">
          {t("common.save")}
        </SubmitButton>
      </ActionForm>
      {initial && <DeleteButton action={deleteDesignAction} id={initial.id} size="lg" />}
    </div>
  );
}
