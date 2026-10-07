"use client";

import { Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { ActionForm, type ActionState } from "./action-form";
import { ConfirmSubmit } from "./fields";

export function DeleteButton({ action, id, label, size = "sm" }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; id: string; label?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const { t } = useI18n();
  return (
    <ActionForm action={action} silent>
      <input type="hidden" name="id" value={id} />
      <ConfirmSubmit message={`${t("common.delete")}?`} size={size}>
        <Trash2 /> {label ?? t("common.delete")}
      </ConfirmSubmit>
    </ActionForm>
  );
}
