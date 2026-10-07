import "server-only";
import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { tailorProfiles, users, type Role } from "@/server/db/schema";
import { AppError, pgError } from "@/server/lib/errors";
import { fakeVerify, hashPassword, verifyPassword } from "@/server/auth/password";
import { slugify } from "@/lib/utils";

export type NewUser = { name: string; email: string; phone: string; password: string };
export type NewTailorShop = {
  shopName: string;
  city: string;
  area: string | null;
  addressLine: string | null;
  lat: number;
  lng: number;
  serves: string[];
  specialties: string[];
  yearsExperience: number;
  isHomeBased: boolean;
  isWomenLed: boolean;
  offersHomeVisit: boolean;
};

function uniqueViolation(e: unknown): never {
  const { code, constraint } = pgError(e);
  if (code === "23505" && constraint === "users_email_uq") throw new AppError("emailTaken", 409);
  if (code === "23505" && constraint === "users_phone_uq") throw new AppError("phoneTaken", 409);
  throw e;
}

export async function registerCustomer(input: NewUser) {
  const passwordHash = await hashPassword(input.password);
  try {
    const [u] = await db.insert(users).values({ name: input.name, email: input.email, phone: input.phone, passwordHash, role: "customer" }).returning();
    return u;
  } catch (e) {
    uniqueViolation(e);
  }
}

export async function registerTailor(input: NewUser, shop: NewTailorShop) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.transaction(async (tx) => {
      const [u] = await tx.insert(users).values({ name: input.name, email: input.email, phone: input.phone, passwordHash, role: "tailor" }).returning();
      const base = slugify(`${shop.shopName} ${shop.area ?? shop.city}`) || "tailor";
      const slug = `${base}-${randomBytes(3).toString("hex")}`;
      await tx.insert(tailorProfiles).values({ userId: u.id, slug, phone: input.phone, status: "pending", ...shop });
      return u;
    });
  } catch (e) {
    uniqueViolation(e);
  }
}

export async function authenticate(email: string, password: string) {
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u) {
    await fakeVerify(password);
    throw new AppError("invalidCredentials", 401);
  }
  if (!(await verifyPassword(u.passwordHash, password))) throw new AppError("invalidCredentials", 401);
  if (!u.isActive) throw new AppError("accountDisabled", 403);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));
  return u as typeof u & { role: Role };
}

export async function changePassword(userId: string, current: string, next: string) {
  const [u] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId));
  if (!u || !(await verifyPassword(u.passwordHash, current))) throw new AppError("wrongPassword");
  // Bumping sessionVersion signs out every other device.
  const [updated] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(next), sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}

export async function updateProfile(userId: string, data: { name: string; phone: string }) {
  try {
    await db.update(users).set(data).where(eq(users.id, userId));
  } catch (e) {
    uniqueViolation(e);
  }
}

export async function setUserLocale(userId: string, locale: "en" | "ur") {
  await db.update(users).set({ locale }).where(eq(users.id, userId));
}
