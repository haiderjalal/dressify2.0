"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTailor } from "@/server/auth/session";
import { parseForm, toActionError, zUuid, type ActionState } from "@/server/lib/action";
import { calendarDay, workshopSchema, WORKSHOP_STAGES } from "@/lib/workshop";
import { createWorkshopJob, moveWorkshopJob, recordWorkshopPayment, updateWorkshopNotes } from "@/server/modules/workshop/service";

export async function createWorkshopAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { tailor } = await requireTailor();
  const parsed = parseForm(workshopSchema, fd);
  if (!parsed.ok) return parsed.state;
  try { await createWorkshopJob(tailor.id, parsed.data); }
  catch (e) { return toActionError(e); }
  revalidatePath("/tailor", "layout");
  return { ok: true, message: "saved", at: Date.now() };
}

export async function workshopAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { tailor } = await requireTailor();
  const parsed = parseForm(z.discriminatedUnion("action", [
    z.object({ action: z.literal("stage"), id: zUuid, expected: z.enum(WORKSHOP_STAGES), stage: z.enum(WORKSHOP_STAGES) }),
    z.object({ action: z.literal("payment"), id: zUuid, amount: z.coerce.number().int().positive().max(10_000_000), method: z.enum(["cash", "bank", "easypaisa"]), requestId: zUuid }),
    z.object({ action: z.literal("notes"), id: zUuid, assignee: z.string().trim().max(80), fabricLocation: z.string().trim().max(80), fittingDate: calendarDay.or(z.literal("")), notes: z.string().trim().max(2000) }),
  ]), fd);
  if (!parsed.ok) return parsed.state;
  try {
    const v = parsed.data;
    if (v.action === "stage") await moveWorkshopJob(tailor.id, v.id, v.expected, v.stage);
    else if (v.action === "payment") await recordWorkshopPayment(tailor.id, v.id, v.amount, v.method, v.requestId);
    else await updateWorkshopNotes(tailor.id, v.id, { assignee: v.assignee, fabricLocation: v.fabricLocation, fittingDate: v.fittingDate || null, notes: v.notes });
  } catch (e) { return toActionError(e); }
  revalidatePath("/tailor", "layout");
  return { ok: true, message: "saved", at: Date.now() };
}
