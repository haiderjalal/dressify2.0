import { describe, expect, it } from "vitest";
import en from "@/i18n/en";
import ur from "@/i18n/ur";
import { priceOrder } from "@/lib/pricing";
import { nextStatus } from "@/server/modules/orders/state";
import { addDays, safeNext, weekday } from "@/lib/utils";
import { cleanMeasurements } from "@/server/modules/customers/service";
import { saveImage } from "@/server/storage";

function leaves(obj: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof v === "string") out[prefix + k] = v;
    else Object.assign(out, leaves(v, `${prefix}${k}.`));
  }
  return out;
}

describe("i18n", () => {
  it("Urdu has every English key with the same {placeholders}", () => {
    const e = leaves(en);
    const u = leaves(ur);
    expect(Object.keys(u).sort()).toEqual(Object.keys(e).sort());
    for (const [k, v] of Object.entries(e)) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      expect(ph(u[k]), k).toBe(ph(v));
    }
  });
});

describe("pricing", () => {
  it("adds delivery and takes commission from stitching + fabric only", () => {
    const own = priceOrder([{ price: 2000, quantity: 2 }], "own");
    expect(own).toMatchObject({ stitchingTotal: 4000, fabricTotal: 0, deliveryFee: 300, total: 4300, commission: 400, tailorPayout: 3900 });
    const store = priceOrder([{ price: 1500, quantity: 1, fabricPricePerMeter: 650, fabricMeters: 4.5 }], "store");
    expect(store).toMatchObject({ fabricTotal: 2925, deliveryFee: 200, total: 4625 });
  });
});

describe("order state machine", () => {
  it("allows only the right actor at the right time", () => {
    expect(nextStatus("accept", "placed", "tailor", "own")).toBe("confirmed");
    expect(nextStatus("accept", "placed", "customer", "own")).toBeNull();
    expect(nextStatus("start_stitching", "confirmed", "tailor", "own")).toBeNull();
    expect(nextStatus("start_stitching", "confirmed", "tailor", "store")).toBe("in_stitching");
    expect(nextStatus("cancel", "in_stitching", "customer", "own")).toBeNull();
    expect(nextStatus("cancel", "in_stitching", "admin", "own")).toBe("cancelled");
    expect(nextStatus("mark_delivered", "ready", "tailor", "own")).toBeNull();
  });
});

describe("utils & validation", () => {
  it("blocks open redirects", () => {
    expect(safeNext("/account/orders")).toBe("/account/orders");
    expect(safeNext("//evil.com", "/")).toBe("/");
    expect(safeNext("https://evil.com", "/")).toBe("/");
    expect(safeNext("/\\evil.com", "/")).toBe("/");
  });
  it("does calendar maths without timezone drift", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekday("2026-10-07")).toBe(3);
  });
  it("keeps only valid measurement fields for the chosen type", () => {
    expect(cleanMeasurements("men", { chest: "40.3", bust: "36", waist: "-2", neck: "abc", shoulder: "18" })).toEqual({ chest: 40.25, shoulder: 18 });
  });
  it("rejects uploads that aren't real images, whatever their name says", async () => {
    const fake = new File([new TextEncoder().encode("<script>alert(1)</script>")], "photo.jpg", { type: "image/jpeg" });
    await expect(saveImage(fake, "designs")).rejects.toMatchObject({ code: "fileType" });
    const big = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", { type: "image/png" });
    await expect(saveImage(big, "designs")).rejects.toMatchObject({ code: "fileTooLarge" });
  });
});
