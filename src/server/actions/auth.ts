"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { endSession, getCurrentUser, homeFor, startSession } from "@/server/auth/session";
import { authenticate, registerCustomer, registerTailor, setUserLocale } from "@/server/modules/accounts/service";
import { clientIp, rateLimit } from "@/server/security/rate-limit";
import { parseForm, toActionError, zLat, zLng, zBool, zEmail, zInt, zNum, zOptionalText, zList, zPassword, zPhone, zText, type ActionState } from "@/server/lib/action";
import { AUDIENCES, GARMENT_CATEGORIES } from "@/lib/constants";
import { safeNext } from "@/lib/utils";
import { LOCALE_COOKIE } from "@/i18n/core";

const loginSchema = z.object({ email: zEmail, password: z.string().min(1, "required").max(128), next: z.string().optional() });

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(loginSchema, fd);
  if (!parsed.ok) return parsed.state;
  let target: string;
  try {
    const ip = await clientIp();
    await rateLimit("login-ip", ip, 20, 60);
    await rateLimit("login-email", parsed.data.email, 8, 300);
    const user = await authenticate(parsed.data.email, parsed.data.password);
    await startSession(user);
    target = safeNext(parsed.data.next, homeFor(user.role));
  } catch (e) {
    return toActionError(e);
  }
  redirect(target);
}

const userSchema = z.object({ name: zText(2, 120), email: zEmail, phone: zPhone, password: zPassword });

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(userSchema.extend({ next: z.string().optional() }), fd);
  if (!parsed.ok) return parsed.state;
  let target: string;
  try {
    await rateLimit("register", await clientIp(), 10, 3600);
    const user = await registerCustomer(parsed.data);
    await startSession(user);
    target = safeNext(parsed.data.next, "/explore");
  } catch (e) {
    return toActionError(e);
  }
  redirect(target);
}

const tailorSchema = userSchema.extend({
  shopName: zText(2, 120),
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
});

export async function registerTailorAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(tailorSchema, fd);
  if (!parsed.ok) return parsed.state;
  try {
    await rateLimit("register", await clientIp(), 10, 3600);
    const { name, email, phone, password, ...shop } = parsed.data;
    const user = await registerTailor({ name, email, phone, password }, shop);
    await startSession(user);
  } catch (e) {
    return toActionError(e);
  }
  redirect("/tailor");
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

export async function setLocaleAction(fd: FormData) {
  const locale = fd.get("locale") === "ur" ? "ur" : "en";
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const user = await getCurrentUser();
  if (user) await setUserLocale(user.id, locale);
  revalidatePath("/", "layout");
}
