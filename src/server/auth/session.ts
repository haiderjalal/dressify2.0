import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { tailorProfiles, users, type Role } from "@/server/db/schema";
import { readSession, SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "./jwt";
import { env } from "@/server/env";

export type CurrentUser = {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  locale: string;
};

export async function startSession(user: { id: string; role: Role; sessionVersion: number }) {
  const token = await signSession({ sub: user.id, role: user.role, ver: user.sessionVersion });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * The signed-in user, verified against the database (active + session version),
 * memoised for the duration of one request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const [u] = await db
    .select({
      id: users.id,
      role: users.role,
      name: users.name,
      email: users.email,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
      isActive: users.isActive,
      sessionVersion: users.sessionVersion,
    })
    .from(users)
    .where(eq(users.id, session.sub))
    .limit(1);
  if (!u || !u.isActive || u.sessionVersion !== session.ver) return null;
  return { id: u.id, role: u.role, name: u.name, email: u.email, phone: u.phone, avatarUrl: u.avatarUrl, locale: u.locale };
});

export const homeFor = (role: Role) => (role === "admin" ? "/admin" : role === "tailor" ? "/tailor" : "/account");

/** Page/action guard: redirects to login (or the user's own area) when not allowed. */
export async function requireUser(role?: Role | Role[], next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  const allowed = role ? (Array.isArray(role) ? role : [role]) : null;
  if (allowed && !allowed.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export const getTailorForUser = cache(async (userId: string) => {
  const [t] = await db.select().from(tailorProfiles).where(eq(tailorProfiles.userId, userId)).limit(1);
  return t ?? null;
});

/** Guard for the tailor dashboard: returns both the user and their shop profile. */
export async function requireTailor() {
  const user = await requireUser("tailor", "/tailor");
  const tailor = await getTailorForUser(user.id);
  if (!tailor) redirect("/join/tailor");
  return { user, tailor };
}
