import { describe, expect, it } from "vitest";
import { canMoveWorkshop, csvCell, workshopSchema, workshopSummary } from "@/lib/workshop";
const input = { customerName: "Hina Khan", phone: "03001234567", garment: "Kurti", quantity: 1, dueDate: "2026-10-12", total: 2400, advance: 500, unit: "in" };
describe("counter order validation", () => {
  it("quotes CSV separators and neutralizes spreadsheet formulas", () => {
    expect(csvCell('Cotton, "blue"')).toBe('"Cotton, ""blue"""');
    expect(csvCell("=SUM(A1:A3)")).toBe('"\'=SUM(A1:A3)"');
    expect(csvCell(" +cmd")).toBe('"\' +cmd"');
    expect(csvCell(2400)).toBe('"2400"');
  });
  it("normalizes phone numbers and retains order-specific measurements", () => {
    expect(workshopSchema.parse({ ...input, phone: "+92 300-1234567", measurements: "Chest 36, sleeve 22" })).toMatchObject({ phone: "03001234567", measurements: "Chest 36, sleeve 22" });
  });
  it("rejects overpaid advances, invalid dates and fittings after delivery", () => {
    expect(workshopSchema.safeParse({ ...input, advance: 2401 }).success).toBe(false);
    expect(workshopSchema.safeParse({ ...input, dueDate: "2026-02-30" }).success).toBe(false);
    expect(workshopSchema.safeParse({ ...input, fittingDate: "2026-10-13" }).success).toBe(false);
    expect(workshopSchema.safeParse({ ...input, total: "", quantity: 0 }).success).toBe(false);
  });
  it("allows alteration loops but prevents skipping to collection", () => {
    expect(canMoveWorkshop("received", "collected")).toBe(false);
    expect(canMoveWorkshop("fitting", "alteration")).toBe(true);
    expect(canMoveWorkshop("alteration", "fitting")).toBe(true);
    expect(canMoveWorkshop("stitching", "ready")).toBe(true);
    expect(canMoveWorkshop("collected", "ready")).toBe(false);
  });
  it("excludes collected jobs from deadlines while retaining unpaid balances", () => {
    expect(workshopSummary([
      { stage: "received", dueDate: "2026-10-06", total: 1000, paid: 200 },
      { stage: "ready", dueDate: "2026-10-07", total: 2000, paid: 500 },
      { stage: "collected", dueDate: "2026-10-01", total: 500, paid: 500 },
    ], "2026-10-07")).toEqual({ active: 2, overdue: 1, dueToday: 1, ready: 1, balance: 2300 });
  });
});
