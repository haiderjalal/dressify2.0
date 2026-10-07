import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, CheckCheck, Scissors } from "lucide-react";
import { requireTailor } from "@/server/auth/session";
import { workshopDetail } from "@/server/modules/workshop/service";
import { getI18n } from "@/i18n/server";
import { formatDate, formatDateTime, formatPrice } from "@/lib/utils";
import { canMoveWorkshop, WORKSHOP_STAGES } from "@/lib/workshop";
import { workshopAction } from "@/server/actions/workshop";
import { ActionForm } from "@/components/forms/action-form";
import { Field, Input, SubmitButton, Textarea } from "@/components/forms/fields";
import { WorkshopPayment } from "@/components/tailor/workshop-payment";
import { PrintButton } from "@/app/invoice/[id]/print-button";

export const metadata = { title: "Workshop job" };
export default async function WorkshopJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { tailor } = await requireTailor();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const detail = await workshopDetail(tailor.id, id);
  if (!detail) notFound();
  const { job, payments } = detail;
  const { t, tx, locale } = await getI18n();
  const balance = job.total - job.paid;
  const fields = [
    [t("workshop.phone"), job.phone], [t("workshop.dueDate"), formatDate(job.dueDate, locale)],
    [t("workshop.fittingDate"), job.fittingDate ? formatDate(job.fittingDate, locale) : "—"],
    [t("workshop.assignee"), job.assignee || "—"], [t("workshop.fabric"), job.fabric || "—"],
    [t("workshop.fabricLocation"), job.fabricLocation || "—"],
    [`${t("workshop.measurements")} (${job.unit})`, job.measurements || "—"], [t("workshop.notes"), job.notes || "—"],
  ];
  return <div className="workshop-detail space-y-6">
    <div className="no-print flex flex-wrap items-center justify-between gap-3"><Link href="/tailor/workshop" className="flex min-h-11 items-center gap-2 text-muted"><ArrowLeft className="size-4 rtl:rotate-180" />{t("workshop.back")}</Link><PrintButton label={t("workshop.print")} /></div>
    <header className="atelier-panel p-6 sm:p-8"><p className="eyebrow">{tailor.shopName} · {t("workshop.reference")} #{job.id.slice(0, 8).toUpperCase()}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-4xl font-semibold">{job.customerName}</h1><span className="rounded-lg bg-emerald-soft px-3 py-2 text-sm font-semibold text-emerald">{tx(`workshop.${job.stage}`)}</span></div><p className="mt-2 text-muted">{job.quantity} × {job.garment}</p></header>
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <section className="atelier-panel p-6"><h2 className="mb-5 flex items-center gap-2 text-xl font-semibold"><Scissors className="size-5 text-gold" />{t("workshop.open")}</h2><dl className="grid gap-5 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-sm text-muted">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium">{value}</dd></div>)}</dl></section>
      <div className="space-y-5"><section className="atelier-panel p-6"><dl className="space-y-3">{[[t("workshop.total"), job.total], [t("workshop.paid"), job.paid], [t("workshop.balance"), balance]].map(([label, amount]) => <div key={String(label)} className="flex flex-wrap justify-between gap-2"><dt className="text-sm text-muted">{label}</dt><dd className="font-semibold tabular-nums">{formatPrice(Number(amount), locale)}</dd></div>)}</dl>
      {balance > 0 ? <div className="no-print mt-6 border-t border-line pt-5"><WorkshopPayment id={job.id} balance={balance} requestId={crypto.randomUUID()} /></div> : <p className="mt-5 flex items-center gap-2 text-success"><CheckCheck className="size-5" />{t("workshop.paid")}</p>}</section>
      {job.stage !== "collected" && <section className="atelier-panel no-print p-6"><h2 className="mb-4 font-semibold">{t("workshop.move")}</h2><div className="flex flex-wrap gap-3">{WORKSHOP_STAGES.filter(stage => canMoveWorkshop(job.stage, stage)).map(stage => <ActionForm action={workshopAction} key={stage}><input type="hidden" name="action" value="stage" /><input type="hidden" name="id" value={job.id} /><input type="hidden" name="expected" value={job.stage} /><input type="hidden" name="stage" value={stage} />{stage === "collected" && balance > 0 ? <p className="text-sm text-warning">{t("workshop.collectionHint")}</p> : <SubmitButton size="xl" variant="emerald">{tx(`workshop.${stage}`)}</SubmitButton>}</ActionForm>)}</div></section>}
      </div>
    </div>
    {job.stage !== "collected" && <details className="atelier-panel no-print p-6"><summary className="cursor-pointer font-semibold">{t("common.edit")} · {t("workshop.notes")}</summary><ActionForm action={workshopAction} className="mt-5 grid gap-4 sm:grid-cols-2"><input type="hidden" name="action" value="notes" /><input type="hidden" name="id" value={job.id} /><Field name="assignee" label={t("workshop.assignee")}><Input name="assignee" defaultValue={job.assignee} maxLength={80} /></Field><Field name="fabricLocation" label={t("workshop.fabricLocation")}><Input name="fabricLocation" defaultValue={job.fabricLocation} maxLength={80} /></Field><Field name="fittingDate" label={t("workshop.fittingDate")}><Input name="fittingDate" type="date" defaultValue={job.fittingDate ?? ""} max={job.dueDate} /></Field><Field name="notes" label={t("workshop.notes")}><Textarea name="notes" defaultValue={job.notes} maxLength={2000} /></Field><SubmitButton size="xl">{t("common.save")}</SubmitButton></ActionForm></details>}
    <section className="atelier-panel p-6"><h2 className="mb-4 text-xl font-semibold">{t("workshop.history")}</h2>{payments.length ? <ul className="divide-y divide-line">{payments.map(p => <li key={p.id} className="flex flex-wrap justify-between gap-3 py-3"><span><span className="block font-medium">{tx(`workshop.${p.method}`)}</span><span className="text-sm text-muted">{formatDateTime(p.createdAt, locale)}</span></span><span className="font-semibold tabular-nums">{formatPrice(p.amount, locale)}</span></li>)}</ul> : <p className="text-muted">{t("workshop.noPayments")}</p>}</section>
  </div>;
}
