"use client";

import { saveAddressAction } from "@/server/actions/account";
import { useI18n } from "@/i18n/client";
import { ActionForm, type ActionState } from "@/components/forms/action-form";
import { Field, Input, SubmitButton } from "@/components/forms/fields";

export function AddressForm({ phone }: { phone: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={saveAddressAction} className="space-y-3" resetOnSuccess>
      <Field label={t("account.label")} name="label">
        <Input name="label" defaultValue="Home" required maxLength={40} />
      </Field>
      <Field label={t("booking.line1")} name="line1">
        <Input name="line1" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("booking.area")} name="area" optional>
          <Input name="area" />
        </Field>
        <Field label={t("booking.city")} name="city">
          <Input name="city" defaultValue="Lahore" required />
        </Field>
      </div>
      <Field label={t("booking.phone")} name="phone">
        <Input name="phone" type="tel" defaultValue={phone} dir="ltr" required />
      </Field>
      <SubmitButton className="w-full">{t("common.save")}</SubmitButton>
    </ActionForm>
  );
}

export function SimpleActionButton({ action, id, label, extra, variant = "outline", size = "sm" }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; id: string; label: string; extra?: Record<string, string>; variant?: "outline" | "primary" | "emerald" | "ghost" | "danger-outline" | "gold"; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <ActionForm action={action} silent>
      <input type="hidden" name="id" value={id} />
      {extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton variant={variant} size={size}>
        {label}
      </SubmitButton>
    </ActionForm>
  );
}
