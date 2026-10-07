import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Locale = "en" | "ur";
export const TIME_ZONE = "Asia/Karachi";

export function formatPrice(amount: number, locale: Locale = "en") {
  const n = Math.round(amount).toLocaleString("en-PK");
  return locale === "ur" ? `${n} روپے` : `Rs ${n}`;
}

const dateFmt = (locale: Locale, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-PK", { timeZone: TIME_ZONE, ...opts });

export function formatDate(value: Date | string, locale: Locale = "en", opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  const d = typeof value === "string" ? (value.length === 10 ? new Date(`${value}T12:00:00+05:00`) : new Date(value)) : value;
  return dateFmt(locale, opts).format(d);
}

export function formatDateTime(value: Date | string, locale: Locale = "en") {
  return formatDate(value, locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function formatTime(value: Date | string, locale: Locale = "en") {
  return formatDate(value, locale, { hour: "numeric", minute: "2-digit" });
}

/** Today's calendar date in Pakistan as YYYY-MM-DD. */
export function todayPK(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

/** Add days to a YYYY-MM-DD string (calendar arithmetic, no timezone drift). */
export function addDays(day: string, days: number) {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday for a YYYY-MM-DD string. */
export function weekday(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function diffDays(from: string, to: string) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 80);
}

export function rating(sum: number, count: number) {
  return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
}

export function formatDistance(km: number | null | undefined, locale: Locale = "en") {
  if (km == null) return "";
  const v = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  return locale === "ur" ? v.replace("km", "کلومیٹر").replace(" m", " میٹر") : v;
}

/** Safe internal redirect target (prevents open redirects via ?next=). */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
