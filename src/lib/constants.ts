/** Business constants shared by server and client. Labels live in the i18n dictionaries. */

export const APP_NAME = "Dressify";

export const NEARBY_RADIUS_KM = 5;
/** Lahore city centre — fallback when the browser location is unavailable. */
export const DEFAULT_CENTER = { lat: 31.5204, lng: 74.3587 } as const;

/** Pick-up + drop-off when the customer gives their own fabric; drop-off only for store fabric. */
export const DELIVERY_FEE = { own: 300, store: 200 } as const;
/** Platform commission taken from the tailor payout (percent). */
export const COMMISSION_PERCENT = 10;
/** How far ahead customers can book a stitching slot. */
export const BOOKING_WINDOW_DAYS = 21;
/** Unpaid online orders release their slot after this many minutes. */
export const PAYMENT_HOLD_MINUTES = 30;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const AUDIENCES = ["men", "women", "kids"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const GARMENT_CATEGORIES = [
  "shalwar_kameez",
  "kurta",
  "sherwani",
  "waistcoat",
  "pant_coat",
  "kurti",
  "frock",
  "lehenga",
  "gharara",
  "abaya",
  "kids_wear",
  "alteration",
] as const;
export type GarmentCategory = (typeof GARMENT_CATEGORIES)[number];

export const FABRIC_MATERIALS = [
  "cotton",
  "lawn",
  "wash_and_wear",
  "linen",
  "khaddar",
  "karandi",
  "cambric",
  "silk",
  "chiffon",
  "organza",
  "velvet",
  "jamawar",
] as const;

export const INVENTORY_CATEGORIES = ["thread", "cloth", "button", "lining", "zip", "lace", "needle", "other"] as const;
export const INVENTORY_UNITS = ["spool", "meter", "piece", "pack"] as const;

export const FORUM_CATEGORIES = ["general", "techniques", "business", "suppliers", "help"] as const;

export const PAYMENT_METHODS = ["easypaisa", "card", "cod"] as const;

/** Measurement fields (inches) per audience. Keys map to `measurements.fields.*` labels. */
export const MEASUREMENT_FIELDS = {
  men: ["neck", "shoulder", "chest", "waist", "hip", "shirtLength", "sleeveLength", "armhole", "bicep", "wrist", "trouserLength", "thigh", "bottom"],
  women: ["shoulder", "bust", "waist", "hip", "shirtLength", "sleeveLength", "armhole", "frontNeckDepth", "backNeckDepth", "trouserLength", "thigh", "bottom"],
  kids: ["chest", "waist", "shoulder", "shirtLength", "sleeveLength", "trouserLength"],
} as const satisfies Record<Audience, readonly string[]>;

export const ORDER_STATUSES = [
  "pending_payment",
  "placed",
  "confirmed",
  "pickup_scheduled",
  "fabric_picked",
  "in_stitching",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

/** Statuses shown on the customer timeline, in order (pickup steps only for own-fabric orders). */
export function timelineFor(fabricSource: "own" | "store") {
  return fabricSource === "own"
    ? (["placed", "confirmed", "pickup_scheduled", "fabric_picked", "in_stitching", "ready", "out_for_delivery", "delivered"] as const)
    : (["placed", "confirmed", "in_stitching", "ready", "out_for_delivery", "delivered"] as const);
}

export const ACTIVE_ORDER_STATUSES = ["placed", "confirmed", "pickup_scheduled", "fabric_picked", "in_stitching", "ready", "out_for_delivery"] as const;
