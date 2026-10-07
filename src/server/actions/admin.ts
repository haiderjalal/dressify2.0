"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { setTailorStatus, setUserActive } from "@/server/modules/admin/service";
import { removePost } from "@/server/modules/forum/service";
import { transitionOrder } from "@/server/modules/orders/service";
import { parseForm, toActionError, zBool, zOptionalText, zUuid, type ActionState } from "@/server/lib/action";

const ok = (): ActionState => ({ ok: true, message: "saved", at: Date.now() });

export async function tailorStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("admin");
  const parsed = parseForm(z.object({ id: zUuid, status: z.enum(["approved", "suspended"]) }), fd);
  if (!parsed.ok) return parsed.state;
  try {
    await setTailorStatus(parsed.data.id, parsed.data.status);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/admin", "layout");
  return ok();
}

export async function userActiveAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireUser("admin");
  const parsed = parseForm(z.object({ id: zUuid, active: zBool }), fd);
  if (!parsed.ok) return parsed.state;
  await setUserActive(admin.id, parsed.data.id, parsed.data.active);
  revalidatePath("/admin/users");
  return ok();
}

export async function removePostAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser("admin");
  const id = zUuid.safeParse(fd.get("id"));
  if (id.success) await removePost(id.data);
  revalidatePath("/admin/community");
  revalidatePath("/tailor/community");
  return ok();
}

export async function adminCancelOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireUser("admin");
  const parsed = parseForm(z.object({ orderId: zUuid, reason: zOptionalText(300) }), fd);
  if (!parsed.ok) return parsed.state;
  try {
    await transitionOrder(admin, parsed.data.orderId, "cancel", { reason: parsed.data.reason });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/admin/orders");
  return ok();
}
