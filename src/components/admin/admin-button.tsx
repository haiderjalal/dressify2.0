"use client";

import { useI18n } from "@/i18n/client";
import { ActionForm, type ActionState } from "@/components/forms/action-form";
import { ConfirmSubmit, SubmitButton } from "@/components/forms/fields";
import type { ButtonVariant } from "@/components/ui/button";

export function AdminButton({ action, fields, label, variant = "outline", confirm }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; fields: Record<string, string>; label: string; variant?: ButtonVariant; confirm?: boolean }) {
  const { t } = useI18n();
  return (
    <ActionForm action={action}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {confirm ? (
        <ConfirmSubmit message={`${label}?`} variant={variant}>
          {label}
        </ConfirmSubmit>
      ) : (
        <SubmitButton variant={variant} size="sm" pendingText={t("common.saving")}>
          {label}
        </SubmitButton>
      )}
    </ActionForm>
  );
}
