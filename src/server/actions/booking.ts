"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { placeOrder } from "@/server/modules/orders/service";
import { rateLimit } from "@/server/security/rate-limit";
import { toActionError, zDay, zOptionalText, zPhone, zText, zUuid, type ActionState } from "@/server/lib/action";
import { PAYMENT_METHODS } from "@/lib/constants";

const itemSchema = z.object({
  designId: zUuid,
  quantity: z.number().int().min(1).max(10),
  fabricId: zUuid.nullable().optional(),
  fabricMeters: z.number().min(0.5).max(30).nullable().optional(),
});

const bookingSchema = z.object({
  tailorId: zUuid,
  fabricSource: z.enum(["own", "store"]),
  items: z.array(itemSchema).min(1).max(10),
  measurementProfileId: zUuid,
  slotDate: zDay,
  address: z.union([
    z.object({ addressId: zUuid }),
    z.object({
      name: zText(2, 120),
      phone: zPhone,
      line1: zText(3, 200),
      area: zOptionalText(120),
      city: zText(2, 80),
      lat: z.number().min(-90).max(90).nullable().optional(),
      lng: z.number().min(-180).max(180).nullable().optional(),
      save: z.boolean().optional(),
    }),
  ]),
  notes: zOptionalText(1000),
  paymentMethod: z.enum(PAYMENT_METHODS),
});

/** The booking wizard posts its state as one JSON field; everything is re-validated here. */
export async function placeOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("customer");
  let json: unknown;
  try {
    json = JSON.parse(String(fd.get("payload") ?? ""));
  } catch {
    return { ok: false, error: "invalid", at: Date.now() };
  }
  const parsed = bookingSchema.safeParse(json);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] ||= /^[a-zA-Z]+$/.test(i.message) ? i.message : "invalid";
    return { ok: false, error: "invalid", fieldErrors, at: Date.now() };
  }
  let target: string;
  try {
    await rateLimit("place-order", user.id, 10, 600);
    const { order } = await placeOrder(user, parsed.data);
    target = order.status === "pending_payment" ? `/pay/${order.id}` : `/account/orders/${order.id}?placed=1`;
  } catch (e) {
    return toActionError(e);
  }
  redirect(target);
}
