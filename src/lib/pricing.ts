import { COMMISSION_PERCENT, DELIVERY_FEE } from "@/lib/constants";

export type PriceLine = { price: number; quantity: number; fabricPricePerMeter?: number | null; fabricMeters?: number | null };

/**
 * Single source of truth for order money. Runs on the server when the order is
 * placed (client totals are only a preview and are never trusted).
 */
export function priceOrder(lines: PriceLine[], fabricSource: "own" | "store") {
  let stitchingTotal = 0;
  let fabricTotal = 0;
  const lineTotals = lines.map((l) => {
    const stitch = l.price * l.quantity;
    const fabric = fabricSource === "store" && l.fabricPricePerMeter && l.fabricMeters ? Math.round(l.fabricPricePerMeter * l.fabricMeters * l.quantity) : 0;
    stitchingTotal += stitch;
    fabricTotal += fabric;
    return stitch + fabric;
  });
  const deliveryFee = DELIVERY_FEE[fabricSource];
  const total = stitchingTotal + fabricTotal + deliveryFee;
  const commission = Math.round(((stitchingTotal + fabricTotal) * COMMISSION_PERCENT) / 100);
  return { lineTotals, stitchingTotal, fabricTotal, deliveryFee, total, commission, tailorPayout: total - commission };
}
