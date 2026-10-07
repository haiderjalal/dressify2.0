/**
 * Session token = signed JWT in an httpOnly cookie. Edge/Node safe (used by proxy.ts).
 * The payload carries the role so routing checks need no database round-trip;
 * pages additionally verify `ver` against the database to support instant revocation.
 */
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "dfy_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = { sub: string; role: "customer" | "tailor" | "admin"; ver: number };

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set (32+ chars)");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ role: payload.role, ver: payload.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .setIssuer("dressify")
    .sign(key());
}

export async function readSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: "dressify", algorithms: ["HS256"] });
    const role = payload.role;
    if (typeof payload.sub !== "string" || (role !== "customer" && role !== "tailor" && role !== "admin") || typeof payload.ver !== "number") return null;
    return { sub: payload.sub, role, ver: payload.ver };
  } catch {
    return null;
  }
}
