import { z } from "zod";

export const WORKSHOP_STAGES = ["received", "cutting", "stitching", "fitting", "alteration", "ready", "collected"] as const;
export type WorkshopStage = typeof WORKSHOP_STAGES[number];
export const calendarDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "invalidDate");
const optional = (max: number) => z.string().trim().max(max).optional().default("");
export const workshopSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().transform(v => v.replace(/[\s-]/g, "").replace(/^\+92/, "0")).pipe(z.string().regex(/^03\d{9}$/, "invalidPhone")),
  garment: z.string().trim().min(2).max(120),
  quantity: z.coerce.number().int().min(1).max(100),
  dueDate: calendarDay,
  fittingDate: calendarDay.or(z.literal("")).optional().default(""),
  total: z.coerce.number().int().min(1).max(10_000_000),
  advance: z.coerce.number().int().min(0).max(10_000_000),
  assignee: optional(80),
  fabric: optional(300),
  fabricLocation: optional(80),
  measurements: optional(2000),
  unit: z.enum(["in", "cm"]),
  notes: optional(2000),
}).refine(v => v.advance <= v.total, { path: ["advance"], message: "invalid" })
  .refine(v => !v.fittingDate || v.fittingDate <= v.dueDate, { path: ["fittingDate"], message: "invalidDate" });

/** Quote CSV values and neutralize formulas in user-entered text. */
export function csvCell(value: string | number | null) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function canMoveWorkshop(from: WorkshopStage, to: WorkshopStage) {
  const allowed: Record<WorkshopStage, WorkshopStage[]> = {
    received: ["cutting"], cutting: ["stitching"], stitching: ["fitting", "ready"],
    fitting: ["alteration", "ready"], alteration: ["fitting", "ready"], ready: ["alteration", "collected"], collected: [],
  };
  return allowed[from].includes(to);
}

export function workshopSummary(jobs: { stage: string; dueDate: string; total: number; paid: number }[], today: string) {
  const active = jobs.filter(j => j.stage !== "collected");
  return {
    active: active.length,
    overdue: active.filter(j => j.dueDate < today).length,
    dueToday: active.filter(j => j.dueDate === today).length,
    ready: active.filter(j => j.stage === "ready").length,
    balance: jobs.reduce((sum, j) => sum + j.total - j.paid, 0),
  };
}
