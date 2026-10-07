"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Download, Plus, Search, Scissors } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { ActionForm } from "@/components/forms/action-form";
import { Field, Input, Select, SubmitButton, Textarea } from "@/components/forms/fields";
import { Button, buttonClass } from "@/components/ui/button";
import { createWorkshopAction } from "@/server/actions/workshop";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { workshopSummary } from "@/lib/workshop";
import type { workshopJobs } from "@/server/db/schema";

type Job = typeof workshopJobs.$inferSelect;
export function WorkshopBook({ jobs, today }: { jobs: Job[]; today: string }) {
  const { t, tx, locale } = useI18n();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("active");
  const [saved, setSaved] = useState(false);
  const summary = workshopSummary(jobs, today);
  const visible = jobs.filter(j => {
    const match = `${j.customerName} ${j.phone} ${j.garment} ${j.assignee}`.toLowerCase().includes(search.toLowerCase());
    return match && (filter === "all" || (filter === "active" && j.stage !== "collected") || (filter === "overdue" && j.stage !== "collected" && j.dueDate < today) || (filter === "dueToday" && j.stage !== "collected" && j.dueDate === today) || (filter === "ready" && j.stage === "ready") || (filter === "unpaid" && j.paid < j.total));
  });
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">{t("workshop.quick")}</p><h1 className="mt-2 font-display text-5xl font-semibold">{t("workshop.title")}</h1><p className="mt-2 max-w-xl text-muted">{t("workshop.subtitle")}</p></div>
      <div className="flex flex-wrap gap-3"><a href="/tailor/workshop/export" className={buttonClass("outline", "xl")} title={t("workshop.exportHint")}><Download />{t("workshop.export")}</a><Button size="xl" onClick={() => { setAdding(!adding); setSaved(false); }} aria-expanded={adding} aria-controls="counter-order-form"><Plus />{adding ? t("common.close") : t("workshop.newJob")}</Button></div>
    </div>
    <div className="workshop-metrics">{(["active", "dueToday", "overdue", "balance"] as const).map(key => <div key={key}><p className="text-sm text-muted">{t(`workshop.${key}`)}</p><p className={cn("mt-2 text-3xl font-semibold tabular-nums", key === "overdue" && summary.overdue > 0 && "text-danger")}>{key === "balance" ? formatPrice(summary[key], locale) : summary[key]}</p></div>)}</div>
    {saved && <p role="status" className="rounded-xl bg-success-soft p-4 text-success">{t("workshop.createSuccess")}</p>}
    {adding && <section id="counter-order-form" className="atelier-panel p-5 sm:p-7">
      <h2 className="text-2xl font-semibold">{t("workshop.newJob")}</h2><p className="mt-1 mb-6 text-muted">{t("workshop.intro")}</p>
      <ActionForm action={createWorkshopAction} onDone={s => { if (s.ok) { setAdding(false); setSaved(true); } }} className="grid gap-4 sm:grid-cols-2">
        {(["customerName", "phone", "garment", "quantity", "dueDate", "fittingDate", "total", "advance", "assignee", "fabricLocation"] as const).map(name => <Field key={name} name={name} label={t(`workshop.${name}`)} optional={["fittingDate", "assignee", "fabricLocation"].includes(name)}>
          <Input name={name} type={name.includes("Date") ? "date" : ["quantity", "total", "advance"].includes(name) ? "number" : name === "phone" ? "tel" : "text"} required={!["fittingDate", "assignee", "fabricLocation"].includes(name)} min={name === "advance" ? 0 : 1} max={name === "quantity" ? 100 : 10_000_000} defaultValue={name === "quantity" ? 1 : name === "advance" ? 0 : undefined} maxLength={name === "phone" ? 20 : 120} />
        </Field>)}
        <Field name="fabric" label={t("workshop.fabric")} hint={t("workshop.fabricHint")}><Textarea name="fabric" maxLength={300} /></Field>
        <Field name="unit" label={t("workshop.unit")}><Select name="unit"><option value="in">{t("common.inches")}</option><option value="cm">cm</option></Select></Field>
        <Field name="measurements" label={t("workshop.measurements")} hint={t("workshop.measurementHint")}><Textarea name="measurements" maxLength={2000} /></Field>
        <Field name="notes" label={t("workshop.notes")} hint={t("workshop.notesHint")}><Textarea name="notes" maxLength={2000} /></Field>
        <div className="sm:col-span-2"><SubmitButton size="xl">{t("workshop.save")}</SubmitButton></div>
      </ActionForm>
    </section>}
    <section className="atelier-panel overflow-hidden">
      <div className="border-b border-line p-5"><label className="relative block"><Search className="absolute top-3.5 start-3.5 size-5 text-muted" /><span className="sr-only">{t("workshop.search")}</span><Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("workshop.search")} className="h-12 ps-11" /></label>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("common.search")}>{["active", "dueToday", "overdue", "ready", "unpaid", "all"].map(f => <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={cn("min-h-11 rounded-lg px-3 text-sm font-medium transition", filter === f ? "bg-emerald text-paper" : "bg-sand/60 text-muted hover:bg-sand")}>{tx(`workshop.${f}`)}</button>)}</div>
      </div>
      {visible.length ? <div className="divide-y divide-line">{visible.map(j => <Link key={j.id} href={`/tailor/workshop/${j.id}`} className="workshop-row group">
        <span className="grid size-12 place-items-center rounded-xl bg-sand text-gold-deep"><Scissors className="size-5" /></span>
        <div className="min-w-0 flex-1"><p className="font-semibold">{j.customerName}<span className="ms-2 text-xs font-normal text-muted">#{j.id.slice(0, 8).toUpperCase()}</span></p><p className="mt-1 text-sm text-muted">{j.quantity} × {j.garment}{j.assignee ? ` · ${j.assignee}` : ""}</p><p className={cn("mt-1 text-sm", j.dueDate < today && j.stage !== "collected" ? "text-danger" : "text-muted")}>{t("workshop.dueDate")}: {formatDate(j.dueDate, locale)}{j.dueDate < today && j.stage !== "collected" ? ` · ${t("workshop.overdue")}` : ""}</p></div>
        <div className="text-end"><span className="inline-block rounded-md bg-emerald-soft px-2.5 py-1 text-xs font-medium text-emerald">{tx(`workshop.${j.stage}`)}</span><p className="mt-2 text-sm font-semibold tabular-nums">{formatPrice(j.total - j.paid, locale)}</p><p className="text-xs text-muted">{t("workshop.balance")}</p></div><ArrowUpRight className="hidden size-5 text-muted sm:block" />
      </Link>)}</div> : <div className="px-6 py-16 text-center"><BookOpen className="mx-auto mb-4 size-10 text-gold" /><h2 className="font-display text-3xl">{jobs.length ? t("workshop.noResults") : t("workshop.empty")}</h2>{!jobs.length && <><p className="mx-auto mt-3 max-w-sm text-muted">{t("workshop.emptyHint")}</p><Button className="mt-6" onClick={() => setAdding(true)}><Plus />{t("workshop.newJob")}</Button></>}</div>}
    </section>
  </div>;
}
