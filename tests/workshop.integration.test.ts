import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { makeTailor } from "./helpers";
import { createWorkshopJob, listWorkshopJobs, moveWorkshopJob, recordWorkshopPayment, workshopDetail, updateWorkshopNotes } from "@/server/modules/workshop/service";

describe("persisted workshop workflows", () => {
  let owner: Awaited<ReturnType<typeof makeTailor>>;
  let other: Awaited<ReturnType<typeof makeTailor>>;
  const fixtureUsers: string[] = [];
  beforeAll(async () => {
    owner = await makeTailor(); fixtureUsers.push(owner.user.id);
    other = await makeTailor(); fixtureUsers.push(other.user.id);
  });
  afterAll(async () => { for (const id of fixtureUsers) await db.delete(users).where(eq(users.id, id)); });
  const input = { customerName: "Workshop test customer", phone: "03001234567", garment: "Kurta", quantity: 1, dueDate: "2026-10-12", total: 2400, advance: 400, unit: "in", measurements: "Chest 40" };
  it("updates fitting instructions without overwriting the original measurements", async () => {
    const job = await createWorkshopJob(owner.tailor.id, input);
    const changes = { assignee: "Nadia", fabricLocation: "B-12", fittingDate: "2026-10-10", notes: "Shorten sleeves by one inch" };
    await expect(updateWorkshopNotes(other.tailor.id, job.id, changes)).rejects.toMatchObject({ code: "invalid" });
    await expect(updateWorkshopNotes(owner.tailor.id, job.id, { ...changes, fittingDate: "2026-10-13" })).rejects.toMatchObject({ code: "invalid" });
    expect(await updateWorkshopNotes(owner.tailor.id, job.id, changes)).toMatchObject({ ...changes, measurements: "Chest 40" });
  });
  it("persists a walk-in without a customer account and protects shop ownership", async () => {
    const job = await createWorkshopJob(owner.tailor.id, input);
    expect((await workshopDetail(owner.tailor.id, job.id))?.payments).toHaveLength(1);
    expect(await workshopDetail(other.tailor.id, job.id)).toBeNull();
    expect(await listWorkshopJobs(other.tailor.id)).toEqual([]);
    await expect(moveWorkshopJob(other.tailor.id, job.id, "received", "cutting")).rejects.toMatchObject({ code: "invalid" });
    await expect(recordWorkshopPayment(other.tailor.id, job.id, 100, "cash", randomUUID())).rejects.toMatchObject({ code: "notFound" });
  });
  it("records partial payments once and rejects a conflicting replay", async () => {
    const job = await createWorkshopJob(owner.tailor.id, input);
    const token = randomUUID();
    await Promise.all([recordWorkshopPayment(owner.tailor.id, job.id, 600, "cash", token), recordWorkshopPayment(owner.tailor.id, job.id, 600, "cash", token)]);
    const detail = await workshopDetail(owner.tailor.id, job.id);
    expect(detail?.job.paid).toBe(1000);
    expect(detail?.payments).toHaveLength(2);
    await expect(recordWorkshopPayment(owner.tailor.id, job.id, 601, "cash", token)).rejects.toMatchObject({ code: "invalid" });
  });
  it("serializes competing payments and never overpays", async () => {
    const job = await createWorkshopJob(owner.tailor.id, input);
    const results = await Promise.allSettled([recordWorkshopPayment(owner.tailor.id, job.id, 1500, "cash", randomUUID()), recordWorkshopPayment(owner.tailor.id, job.id, 1500, "bank", randomUUID())]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect((await workshopDetail(owner.tailor.id, job.id))?.job.paid).toBe(1900);
  });
  it("rejects stale transitions and requires settlement before collection", async () => {
    const job = await createWorkshopJob(owner.tailor.id, input);
    await moveWorkshopJob(owner.tailor.id, job.id, "received", "cutting");
    await expect(moveWorkshopJob(owner.tailor.id, job.id, "received", "cutting")).rejects.toMatchObject({ code: "invalid" });
    await moveWorkshopJob(owner.tailor.id, job.id, "cutting", "stitching");
    await moveWorkshopJob(owner.tailor.id, job.id, "stitching", "ready");
    await expect(moveWorkshopJob(owner.tailor.id, job.id, "ready", "collected")).rejects.toMatchObject({ code: "invalid" });
    await recordWorkshopPayment(owner.tailor.id, job.id, 2000, "cash", randomUUID());
    expect((await moveWorkshopJob(owner.tailor.id, job.id, "ready", "collected")).stage).toBe("collected");
  });
});
