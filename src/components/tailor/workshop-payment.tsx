"use client";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { ActionForm } from "@/components/forms/action-form";
import { Field, Input, Select, SubmitButton } from "@/components/forms/fields";
import { workshopAction } from "@/server/actions/workshop";
export function WorkshopPayment({ id, balance, requestId }: { id: string; balance: number; requestId: string }) {
  const { t } = useI18n();
  const [token, setToken] = useState(requestId);
  return <ActionForm action={workshopAction} resetOnSuccess onDone={s => { if (s.ok) setToken(crypto.randomUUID()); }} className="space-y-4">
    <input type="hidden" name="action" value="payment" /><input type="hidden" name="id" value={id} /><input type="hidden" name="requestId" value={token} />
    <Field name="amount" label={t("workshop.amount")}><Input type="number" name="amount" required min={1} max={balance} defaultValue={balance} /></Field>
    <Field name="method" label={t("workshop.method")}><Select name="method"><option value="cash">{t("workshop.cash")}</option><option value="bank">{t("workshop.bank")}</option><option value="easypaisa">{t("workshop.easypaisa")}</option></Select></Field>
    <SubmitButton size="xl" className="w-full">{t("workshop.payment")}</SubmitButton>
  </ActionForm>;
}
