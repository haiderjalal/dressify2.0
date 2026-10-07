import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "@/server/auth/jwt";

/**
 * Fast edge gate for private areas: verifies the signed session cookie and the
 * role without touching the database. Pages and actions re-check the session
 * against the database (revocation, deactivation) — this is the first line only.
 */
const AREAS = [
  { prefix: "/account", role: "customer" },
  { prefix: "/tailor", role: "tailor" },
  { prefix: "/admin", role: "admin" },
] as const;

const HOME = { customer: "/account", tailor: "/tailor", admin: "/admin" } as const;

export async function proxy(req: NextRequest) {
  if (req.method !== "GET" && req.method !== "HEAD") return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  const area = AREAS.find((a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`));
  if (!area) return NextResponse.next();

  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (session.role !== area.role) return NextResponse.redirect(new URL(HOME[session.role], req.url));
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  matcher: ["/account/:path*", "/tailor/:path*", "/admin/:path*"],
};
