"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, startSession } from "@/server/auth/session";
import { changePassword, updateProfile } from "@/server/modules/accounts/service";
import {
  cleanMeasurements,
  deleteAddress,
  deleteMeasurement,
  saveAddress,
  saveMeasurement,
  setDefaultAddress,
  toggleFavorite,
} from "@/server/modules/customers/service";
import { requestAppointment, updateAppointment } from "@/server/modules/appointments/service";
import { addReview, transitionOrder } from "@/server/modules/orders/service";
import { rateLimit } from "@/server/security/rate-limit";
import { parseForm, toActionError, zInt, zNum, zOptionalText, zPassword, zPhone, zText, zUuid, type ActionState } from "@/server/lib/action";
import { AUDIENCES } from "@/lib/constants";

const ok = (message?: string): ActionState => ({ ok: true, message, at: Date.now() });

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(z.object({ name: zText(2, 120), phone: zPhone }), fd);
  if (!parsed.ok) return parsed.state;
  try {
    await updateProfile(user.id, parsed.data);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/", "layout");
  return ok("saved");
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(z.object({ current: z.string().min(1, "required"), next: zPassword }), fd);
  if (!parsed.ok) return parsed.state;
  try {
    await rateLimit("change-password", user.id, 5, 300);
    const updated = await changePassword(user.id, parsed.data.current, parsed.data.next);
    await startSession(updated); // keep this device signed in with the new session version
  } catch (e) {
    return toActionError(e);
  }
  return ok("passwordChanged");
}

/* ─── Measurements ─── */
export async function saveMeasurementAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("customer");
  const parsed = parseForm(
    z.object({ id: zUuid.optional().or(z.literal("")), name: zText(1, 60), gender: z.enum(AUDIENCES), notes: zOptionalText(500), returnTo: z.string().optional() }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const raw: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (k.startsWith("m_")) raw[k.slice(2)] = v;
  const values = cleanMeasurements(parsed.data.gender, raw);
  if (Object.keys(values).length < 3) return { ok: false, error: "required", fieldErrors: { values: "required" }, at: Date.now() };
  let id: string;
  try {
    id = await saveMeasurement(user.id, parsed.data.id || null, { name: parsed.data.name, gender: parsed.data.gender, values, notes: parsed.data.notes });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/account/measurements");
  return { ok: true, message: "saved", data: { id }, at: Date.now() };
}

export async function deleteMeasurementAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("customer");
  const id = zUuid.safeParse(fd.get("id"));
  if (id.success) await deleteMeasurement(user.id, id.data);
  revalidatePath("/account/measurements");
  return ok();
}

/* ─── Addresses ─── */
export async function saveAddressAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("customer");
  const parsed = parseForm(
    z.object({
      label: zText(1, 40),
      line1: zText(3, 200),
      area: zOptionalText(120),
      city: zText(2, 80),
      phone: zPhone,
      lat: zNum(-90, 90).optional().or(z.literal("").transform(() => undefined)),
      lng: zNum(-180, 180).optional().or(z.literal("").transform(() => undefined)),
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const { lat, lng, ...rest } = parsed.data;
  await saveAddress(user.id, { ...rest, lat: lat ?? null, lng: lng ?? null });
  revalidatePath("/account/addresses");
  return ok("saved");
}

export async function deleteAddressAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("customer");
  const id = zUuid.safeParse(fd.get("id"));
  if (id.success) await deleteAddress(user.id, id.data);
  revalidatePath("/account/addresses");
  return ok();
}

export async function defaultAddressAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("customer");
  const id = zUuid.safeParse(fd.get("id"));
  if (id.success) await setDefaultAddress(user.id, id.data);
  revalidatePath("/account/addresses");
  return ok();
}

/* ─── Favourites ─── */
export async function toggleFavoriteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("customer", typeof fd.get("path") === "string" ? String(fd.get("path")) : undefined);
  const id = zUuid.safeParse(fd.get("tailorId"));
  if (!id.success) return { ok: false, error: "invalid", at: Date.now() };
  const saved = await toggleFavorite(user.id, id.data);
  revalidatePath("/account/saved");
  return { ok: true, data: { saved }, at: Date.now() };
}

/* ─── Orders (customer side) ─── */
export async function customerOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("customer");
  const parsed = parseForm(z.object({ orderId: zUuid, action: z.enum(["cancel", "confirm_received"]), reason: zOptionalText(300) }), fd);
  if (!parsed.ok) return parsed.state;
  try {
    await transitionOrder(user, parsed.data.orderId, parsed.data.action, { reason: parsed.data.reason });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath(`/account/orders/${parsed.data.orderId}`);
  revalidatePath("/account/orders");
  return ok();
}

export async function reviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("customer");
  const parsed = parseForm(z.object({ orderId: zUuid, rating: zInt(1, 5), comment: zOptionalText(1000) }), fd);
  if (!parsed.ok) return parsed.state;
  try {
    await addReview(user, parsed.data.orderId, parsed.data.rating, parsed.data.comment);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath(`/account/orders/${parsed.data.orderId}`);
  return ok("reviewThanks");
}

/* ─── Appointments ─── */
export async function requestAppointmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("customer");
  const parsed = parseForm(
    z.object({
      tailorId: zUuid,
      when: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "invalidDate"),
      type: z.enum(["measurement", "consultation", "fitting"]),
      mode: z.enum(["at_shop", "home_visit"]),
      notes: zOptionalText(500),
      addressText: zOptionalText(240),
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  try {
    await rateLimit("appointment", user.id, 10, 3600);
    // datetime-local has no zone; customers are in Pakistan (UTC+5, no DST).
    const scheduledAt = new Date(`${parsed.data.when}:00+05:00`);
    await requestAppointment(user.id, { ...parsed.data, scheduledAt });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/account/appointments");
  return ok("requested");
}

export async function customerAppointmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("customer");
  const id = zUuid.safeParse(fd.get("id"));
  if (!id.success) return { ok: false, error: "invalid", at: Date.now() };
  try {
    await updateAppointment({ id: user.id, role: "customer" }, id.data, "cancel");
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/account/appointments");
  return ok();
}
