"use client";

import { loginAction, registerAction } from "@/server/actions/auth";
import { useI18n } from "@/i18n/client";
import { ActionForm } from "@/components/forms/action-form";
import { Field, Input, SubmitButton } from "@/components/forms/fields";

export function LoginForm({ next }: { next?: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={loginAction} className="mt-8 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label={t("auth.email")} name="email">
        <Input type="email" name="email" autoComplete="email" required dir="ltr" />
      </Field>
      <Field label={t("auth.password")} name="password">
        <Input type="password" name="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full">
        {t("common.signIn")}
      </SubmitButton>
    </ActionForm>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={registerAction} className="mt-8 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label={t("auth.name")} name="name">
        <Input name="name" autoComplete="name" required minLength={2} maxLength={120} />
      </Field>
      <Field label={t("auth.email")} name="email">
        <Input type="email" name="email" autoComplete="email" required dir="ltr" />
      </Field>
      <Field label={t("auth.phone")} name="phone">
        <Input type="tel" name="phone" autoComplete="tel" required placeholder={t("auth.phonePlaceholder")} dir="ltr" />
      </Field>
      <Field label={t("auth.password")} name="password" hint={t("auth.passwordHint")}>
        <Input type="password" name="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton size="lg" className="w-full">
        {t("common.signUp")}
      </SubmitButton>
    </ActionForm>
  );
}
