import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { workshopJobs, workshopPayments } from "@/server/db/schema";
import { canMoveWorkshop, workshopSchema, type WorkshopStage } from "@/lib/workshop";
import { AppError } from "@/server/lib/errors";

export async function listWorkshopJobs(tailorId: string) {
  return db.select().from(workshopJobs).where(eq(workshopJobs.tailorId, tailorId)).orderBy(asc(workshopJobs.dueDate));
}

export async function createWorkshopJob(tailorId: string, input: unknown) {
  const { advance, fittingDate, ...data } = workshopSchema.parse(input);
  return db.transaction(async tx => {
    const [job] = await tx.insert(workshopJobs).values({ ...data, tailorId, paid: advance, fittingDate: fittingDate || null }).returning();
    if (advance) await tx.insert(workshopPayments).values({ jobId: job.id, requestId: crypto.randomUUID(), amount: advance, method: "cash" });
    return job;
  });
}

export async function moveWorkshopJob(tailorId: string, id: string, expected: WorkshopStage, stage: WorkshopStage) {
  if (!canMoveWorkshop(expected, stage)) throw new AppError("invalid");
  const [job] = await db.update(workshopJobs).set({ stage }).where(and(
    eq(workshopJobs.id, id), eq(workshopJobs.tailorId, tailorId), eq(workshopJobs.stage, expected),
    ...(stage === "collected" ? [sql`${workshopJobs.paid} = ${workshopJobs.total}`] : []),
  )).returning();
  if (!job) throw new AppError("invalid");
  return job;
}

export async function recordWorkshopPayment(tailorId: string, id: string, amount: number, method: string, requestId: string) {
  if (!Number.isInteger(amount) || amount <= 0 || !["cash", "bank", "easypaisa"].includes(method)) throw new AppError("invalid");
  return db.transaction(async tx => {
    // Lock the job so concurrent payments cannot overpay the balance.
    const [job] = await tx.select().from(workshopJobs).where(and(eq(workshopJobs.id, id), eq(workshopJobs.tailorId, tailorId))).for("update");
    if (!job) throw new AppError("notFound");
    const [existing] = await tx.select().from(workshopPayments).where(eq(workshopPayments.requestId, requestId));
    if (existing) {
      if (existing.jobId !== id || existing.amount !== amount || existing.method !== method) throw new AppError("invalid");
      return job;
    }
    if (amount > job.total - job.paid) throw new AppError("invalid");
    await tx.insert(workshopPayments).values({ jobId: id, amount, method, requestId });
    const [updated] = await tx.update(workshopJobs).set({ paid: job.paid + amount }).where(eq(workshopJobs.id, id)).returning();
    return updated;
  });
}

export async function workshopDetail(tailorId: string, id: string) {
  const [job] = await db.select().from(workshopJobs).where(and(eq(workshopJobs.id, id), eq(workshopJobs.tailorId, tailorId)));
  if (!job) return null;
  const payments = await db.select().from(workshopPayments).where(eq(workshopPayments.jobId, id)).orderBy(asc(workshopPayments.createdAt));
  return { job, payments };
}

export async function updateWorkshopNotes(tailorId: string, id: string, data: { assignee: string; fabricLocation: string; fittingDate: string | null; notes: string }) {
  const [job] = await db.update(workshopJobs).set(data).where(and(eq(workshopJobs.id, id), eq(workshopJobs.tailorId, tailorId), sql`${workshopJobs.stage} <> 'collected'`,
    ...(data.fittingDate ? [sql`${workshopJobs.dueDate} >= ${data.fittingDate}::date`] : []),
  )).returning();
  if (!job) throw new AppError("invalid");
  return job;
}
