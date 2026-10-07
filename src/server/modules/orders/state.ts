import type { OrderStatus, Role } from "@/server/db/schema";

/**
 * Order state machine. Every status change goes through `nextStatus`, which
 * checks both the current status and who is acting — so a customer can never
 * mark an order delivered for the tailor, and stale tabs can't move an order backwards.
 */
export type OrderAction =
  | "accept"
  | "decline"
  | "schedule_pickup"
  | "mark_picked"
  | "start_stitching"
  | "mark_ready"
  | "dispatch"
  | "mark_delivered"
  | "confirm_received"
  | "cancel";

type Rule = { from: OrderStatus[]; to: OrderStatus; actors: Role[]; fabric?: "own" | "store" };

const RULES: Record<OrderAction, Rule | Rule[]> = {
  accept: { from: ["placed"], to: "confirmed", actors: ["tailor"] },
  decline: { from: ["placed"], to: "cancelled", actors: ["tailor"] },
  schedule_pickup: { from: ["confirmed", "pickup_scheduled"], to: "pickup_scheduled", actors: ["tailor"], fabric: "own" },
  mark_picked: { from: ["pickup_scheduled"], to: "fabric_picked", actors: ["tailor"], fabric: "own" },
  start_stitching: [
    { from: ["fabric_picked"], to: "in_stitching", actors: ["tailor"], fabric: "own" },
    { from: ["confirmed"], to: "in_stitching", actors: ["tailor"], fabric: "store" },
  ],
  mark_ready: { from: ["in_stitching"], to: "ready", actors: ["tailor"] },
  dispatch: { from: ["ready", "out_for_delivery"], to: "out_for_delivery", actors: ["tailor"] },
  mark_delivered: { from: ["out_for_delivery"], to: "delivered", actors: ["tailor"] },
  confirm_received: { from: ["out_for_delivery"], to: "delivered", actors: ["customer"] },
  cancel: [
    { from: ["pending_payment", "placed"], to: "cancelled", actors: ["customer"] },
    { from: ["pending_payment", "placed", "confirmed", "pickup_scheduled", "fabric_picked", "in_stitching", "ready", "out_for_delivery"], to: "cancelled", actors: ["admin"] },
  ],
};

export function nextStatus(action: OrderAction, current: OrderStatus, actor: Role, fabricSource: "own" | "store"): OrderStatus | null {
  const rules = ([] as Rule[]).concat(RULES[action]);
  const rule = rules.find((r) => r.actors.includes(actor) && r.from.includes(current) && (!r.fabric || r.fabric === fabricSource));
  return rule ? rule.to : null;
}

/** The single primary action a tailor should take next — drives the big button in the dashboard. */
export type TailorStep = "accept" | "schedule_pickup" | "mark_picked" | "start_stitching" | "mark_ready" | "dispatch" | "mark_delivered";

export function tailorNextAction(status: OrderStatus, fabricSource: "own" | "store"): TailorStep | null {
  switch (status) {
    case "placed":
      return "accept";
    case "confirmed":
      return fabricSource === "own" ? "schedule_pickup" : "start_stitching";
    case "pickup_scheduled":
      return "mark_picked";
    case "fabric_picked":
      return "start_stitching";
    case "in_stitching":
      return "mark_ready";
    case "ready":
      return "dispatch";
    case "out_for_delivery":
      return "mark_delivered";
    default:
      return null;
  }
}

export const NEEDS_RIDER: OrderAction[] = ["schedule_pickup", "dispatch"];
