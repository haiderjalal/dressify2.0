"use client";

import { changePasswordAction, updateProfileAction } from "@/server/actions/account";
import { logoutAction } from "@/server/actions/auth";
import { useI18n } from "@/i18n/client";
import { ActionForm } from "@/components/forms/action-form";
import { Field, Input, SubmitButton } from "@/components/forms/fields";
import { Card } from "@/components/ui/card";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { LogOut } from "lucide-react";

export function SettingsForms({ name, email, phone, large }: { name: string; email: string; phone: string; large?: boolean }) {
  const { t } = useI18n();
  const size = large ? "lg" : "md";
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="mb-4 font-semibold">{t("account.profile")}</h2>
        <ActionForm action={updateProfileAction} className="space-y-4">
          <Field label={t("account.name")} name="name">
            <Input name="name" defaultValue={name} required size={size} />
          </Field>
          <Field label={t("account.email")}>
            <Input value={email} disabled dir="ltr" size={size} />
          </Field>
          <Field label={t("account.phone")} name="phone">
            <Input name="phone" defaultValue={phone} dir="ltr" required size={size} />
          </Field>
          <SubmitButton size={large ? "xl" : "md"}>{t("common.save")}</SubmitButton>
        </ActionForm>
      </Card>
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">{t("account.changePassword")}</h2>
          <ActionForm action={changePasswordAction} className="space-y-4" resetOnSuccess>
            <Field label={t("account.currentPassword")} name="current">
              <Input type="password" name="current" required autoComplete="current-password" size={size} />
            </Field>
            <Field label={t("account.newPassword")} name="next" hint={t("auth.passwordHint")}>
              <Input type="password" name="next" required minLength={8} autoComplete="new-password" size={size} />
            </Field>
            <SubmitButton variant="outline" size={large ? "xl" : "md"}>{t("account.changePassword")}</SubmitButton>
          </ActionForm>
        </Card>
        <Card className="flex flex-wrap items-center justify-between gap-3 p-6">
          <LanguageToggle large={large} />
          <form action={logoutAction}>
            <button type="submit" className="inline-flex items-center gap-2 text-sm font-medium text-danger hover:underline">
              <LogOut className="size-4" /> {t("common.signOut")}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
