"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTailor } from "@/server/auth/session";
import { transitionOrder } from "@/server/modules/orders/service";
import { deleteDesign, deleteFabric, saveDesign, saveFabric, setDayOverride, updateCapacity, updateShop } from "@/server/modules/catalog/service";
import { adjustItem, deleteItem, saveItem } from "@/server/modules/inventory/service";
import { updateAppointment } from "@/server/modules/appointments/service";
import { createPost, createReply } from "@/server/modules/forum/service";
import { isFile, saveImage } from "@/server/storage";
import { rateLimit } from "@/server/security/rate-limit";
import { parseForm, toActionError, zLat, zLng, zBool, zDay, zInt, zList, zNum, zOptionalText, zPhone, zText, zUuid, type ActionState } from "@/server/lib/action";
import { AUDIENCES, FABRIC_MATERIALS, FORUM_CATEGORIES, GARMENT_CATEGORIES, INVENTORY_CATEGORIES, INVENTORY_UNITS } from "@/lib/constants";

const ok = (message?: string): ActionState => ({ ok: true, message, at: Date.now() });
const optionalId = zUuid.optional().or(z.literal("").transform(() => undefined));

/* ─── Orders ─── */
export async function tailorOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireTailor();
  const parsed = parseForm(
    z.object({
      orderId: zUuid,
      action: z.enum(["accept", "decline", "schedule_pickup", "mark_picked", "start_stitching", "mark_ready", "dispatch", "mark_delivered"]),
      riderName: zOptionalText(80),
      riderPhone: z.string().optional(),
      reason: zOptionalText(300),
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  const { orderId, action, riderName, riderPhone, reason } = parsed.data;
  let rider: { name: string; phone: string; at: string } | undefined;
  if (action === "schedule_pickup" || action === "dispatch") {
    const phone = zPhone.safeParse(riderPhone ?? "");
    if (!riderName) return { ok: false, error: "required", fieldErrors: { riderName: "required" }, at: Date.now() };
    if (!phone.success) return { ok: false, error: "invalidPhone", fieldErrors: { riderPhone: "invalidPhone" }, at: Date.now() };
    rider = { name: riderName, phone: phone.data, at: new Date().toISOString() };
  }
  try {
    await transitionOrder(user, orderId, action, { rider, reason });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/tailor", "layout");
  return ok("saved");
}

/* ─── Designs ─── */
const designSchema = z.object({
  id: optionalId,
  title: zText(2, 120),
  description: zOptionalText(1500),
  category: z.enum(GARMENT_CATEGORIES),
  audience: z.enum(AUDIENCES),
  price: zInt(100, 1_000_000),
  durationDays: zInt(1, 90),
  isActive: zBool,
});

export async function saveDesignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { tailor } = await requireTailor();
  const parsed = parseForm(designSchema, fd);
  if (!parsed.ok) return parsed.state;
  try {
    await rateLimit("upload", tailor.id, 60, 3600);
    const photos = fd.getAll("photos").filter(isFile).slice(0, 6);
    const images = await Promise.all(photos.map((f) => saveImage(f, "designs")));
    const tryOnFile = fd.get("tryOn");
    const tryOnUrl = isFile(tryOnFile) ? await saveImage(tryOnFile, "tryon", { pngOnly: true }) : undefined;
    const { id, ...data } = parsed.data;
    await saveDesign(tailor, id ?? null, { ...data, images: images.length ? images : undefined, tryOnUrl });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/tailor/portfolio");
  redirect("/tailor/portfolio");
}

export async function deleteDesignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { tailor } = await requireTailor();
  const id = zUuid.safeParse(fd.get("id"));
  if (id.success) await deleteDesign(tailor, id.data);
  revalidatePath("/tailor/portfolio");
  return ok();
}

/* ─── Fabrics ─── */
export async function saveFabricAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { tailor } = await requireTailor();
  const parsed = parseForm(
    z.object({
      id: optionalId,
      name: zText(2, 120),
      material: z.enum(FABRIC_MATERIALS),
      colorName: zText(1, 40),
      colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "invalid"),
      pricePerMeter: zInt(10, 200_000),
      stockMeters: zNum(0, 100_000),
      isActive: zBool,
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  try {
    const img = fd.get("image");
    const imageUrl = isFile(img) ? await saveImage(img, "fabrics") : undefined;
    const { id, ...data } = parsed.data;
    await saveFabric(tailor, id ?? null, { ...data, imageUrl });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/tailor/fabrics");
  return ok("saved");
}

export async function deleteFabricAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { tailor } = await requireTailor();
  const id = zUuid.safeParse(fd.get("id"));
  if (id.success) await deleteFabric(tailor, id.data);
  revalidatePath("/tailor/fabrics");
  return ok();
}

/* ─── Inventory ─── */
export async function saveItemAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { tailor } = await requireTailor();
  const parsed = parseForm(
    z.object({
      id: optionalId,
      name: zText(1, 120),
      category: z.enum(INVENTORY_CATEGORIES),
      unit: z.enum(INVENTORY_UNITS),
      quantity: zNum(0, 1_000_000),
      lowStockAt: zNum(0, 1_000_000),
      costPerUnit: zInt(0, 1_000_000),
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  try {
    const { id, ...data } = parsed.data;
    await saveItem(tailor.id, id ?? null, data);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/tailor/inventory");
  return ok("saved");
}

export async function adjustItemAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { tailor } = await requireTailor();
  const parsed = parseForm(z.object({ id: zUuid, delta: zNum(-100_000, 100_000) }), fd);
  if (!parsed.ok) return parsed.state;
  try {
    await adjustItem(tailor.id, parsed.data.id, parsed.data.delta, parsed.data.delta > 0 ? "restock" : "used");
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/tailor/inventory");
  return ok();
}

export async function deleteItemAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { tailor } = await requireTailor();
  const id = zUuid.safeParse(fd.get("id"));
  if (id.success) await deleteItem(tailor.id, id.data);
  revalidatePath("/tailor/inventory");
  return ok();
}

/* ─── Availability ─── */
export async function capacityAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { tailor } = await requireTailor();
  const parsed = parseForm(z.object({ dailyCapacity: zInt(0, 50), workingDays: zList(zInt(0, 6)) }), fd);
  if (!parsed.ok) return parsed.state;
  await updateCapacity(tailor, parsed.data.dailyCapacity, [...new Set(parsed.data.workingDays)].sort());
  revalidatePath("/tailor/availability");
  return ok("saved");
}

export async function dayOverrideAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { tailor } = await requireTailor();
  const parsed = parseForm(z.object({ day: zDay, capacity: z.union([z.literal("reset"), zInt(0, 50)]) }), fd);
  if (!parsed.ok) return parsed.state;
  await setDayOverride(tailor, parsed.data.day, parsed.data.capacity === "reset" ? null : parsed.data.capacity);
  revalidatePath("/tailor/availability");
  return ok();
}

/* ─── Shop settings ─── */
export async function updateShopAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { tailor } = await requireTailor();
  const parsed = parseForm(
    z.object({
      shopName: zText(2, 120),
      bio: zOptionalText(2000),
      phone: zPhone,
      city: zText(2, 80),
      area: zOptionalText(120),
      addressLine: zOptionalText(200),
      lat: zLat,
      lng: zLng,
      serves: zList(z.enum(AUDIENCES)),
      specialties: zList(z.enum(GARMENT_CATEGORIES)),
      yearsExperience: zInt(0, 70),
      isHomeBased: zBool,
      isWomenLed: zBool,
      offersHomeVisit: zBool,
    }),
    fd,
  );
  if (!parsed.ok) return parsed.state;
  try {
    const avatar = fd.get("avatar");
    const cover = fd.get("cover");
    await updateShop(tailor, {
      ...parsed.data,
      avatarUrl: isFile(avatar) ? await saveImage(avatar, "avatars") : undefined,
      coverUrl: isFile(cover) ? await saveImage(cover, "covers") : undefined,
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/tailor", "layout");
  return ok("shopSaved");
}

/* ─── Appointments ─── */
export async function tailorAppointmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireTailor();
  const parsed = parseForm(z.object({ id: zUuid, action: z.enum(["confirm", "decline", "complete"]) }), fd);
  if (!parsed.ok) return parsed.state;
  try {
    await updateAppointment({ id: user.id, role: "tailor" }, parsed.data.id, parsed.data.action);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/tailor/appointments");
  return ok();
}

/* ─── Community ─── */
export async function createPostAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireTailor();
  const parsed = parseForm(z.object({ title: zText(4, 160), body: zText(4, 5000), category: z.enum(FORUM_CATEGORIES) }), fd);
  if (!parsed.ok) return parsed.state;
  let id: string;
  try {
    await rateLimit("forum-post", user.id, 10, 3600);
    id = await createPost(user.id, parsed.data);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/tailor/community");
  redirect(`/tailor/community/${id}`);
}

export async function createReplyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireTailor();
  const parsed = parseForm(z.object({ postId: zUuid, body: zText(1, 3000) }), fd);
  if (!parsed.ok) return parsed.state;
  try {
    await rateLimit("forum-reply", user.id, 30, 3600);
    await createReply(user.id, parsed.data.postId, parsed.data.body);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath(`/tailor/community/${parsed.data.postId}`);
  return ok();
}
