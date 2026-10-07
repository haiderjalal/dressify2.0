import "server-only";
import { z } from "zod";
import { AppError, type ErrorCode } from "./errors";

/** Uniform result for every server action — consumed by useActionState in forms. */
export type ActionState<T = unknown> =
  | { ok: true; message?: string; data?: T; at?: number }
  | { ok: false; error: ErrorCode | string; fieldErrors?: Record<string, string>; at?: number }
  | null;

/** Parse FormData with a zod schema; field errors become i18n keys. */
export function parseForm<S extends z.ZodType>(schema: S, input: FormData | Record<string, unknown>) {
  const raw = input instanceof FormData ? formToObject(input) : input;
  const res = schema.safeParse(raw);
  if (res.success) return { ok: true as const, data: res.data as z.infer<S> };
  const fieldErrors: Record<string, string> = {};
  for (const issue of res.error.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = typeof issue.message === "string" && /^[a-zA-Z]+$/.test(issue.message) ? issue.message : "invalid";
  }
  return { ok: false as const, state: { ok: false as const, error: "invalid", fieldErrors, at: Date.now() } };
}

export function formToObject(fd: FormData) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of fd.entries()) {
    if (key.startsWith("$ACTION")) continue;
    if (key.endsWith("[]")) {
      const k = key.slice(0, -2);
      (out[k] ??= [] as unknown[]) as unknown[];
      (out[k] as unknown[]).push(value);
    } else out[key] = value;
  }
  return out;
}

/** Convert thrown errors into a safe ActionState. */
export function toActionError(err: unknown): ActionState {
  if (err instanceof AppError) return { ok: false, error: err.code, at: Date.now() };
  // Let Next.js redirects / notFound propagate.
  if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: unknown }).digest === "string") {
    const d = (err as { digest: string }).digest;
    if (d.startsWith("NEXT_REDIRECT") || d.startsWith("NEXT_HTTP_ERROR_FALLBACK") || d.startsWith("NEXT_NOT_FOUND")) throw err;
  }
  console.error("[action] unexpected error", err);
  return { ok: false, error: "generic", at: Date.now() };
}

/* Shared zod helpers — messages are i18n keys under `errors.*`. */
export const zText = (min = 1, max = 200) =>
  z
    .string({ error: "required" })
    .trim()
    .min(min, min <= 1 ? "required" : "tooShort")
    .max(max, "tooLong");
export const zOptionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .nullish()
    .transform((v) => (v ? v : null));
export const zEmail = z.string({ error: "required" }).trim().toLowerCase().pipe(z.email("invalidEmail")).pipe(z.string().max(254, "tooLong"));
/** Pakistani mobile numbers: 03XXXXXXXXX or +923XXXXXXXXX → normalised to 03XXXXXXXXX */
export const zPhone = z
  .string({ error: "required" })
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^\+92/, "0").replace(/^92(?=3)/, "0"))
  .pipe(z.string().regex(/^03\d{9}$/, "invalidPhone"));
export const zPassword = z.string({ error: "required" }).min(8, "passwordTooShort").max(128, "tooLong");
export const zInt = (min: number, max: number) => z.coerce.number({ error: "invalid" }).int("invalid").min(min, "invalid").max(max, "invalid");
export const zNum = (min: number, max: number) => z.coerce.number({ error: "invalid" }).min(min, "invalid").max(max, "invalid");
export const zBool = z.preprocess((v) => v === "on" || v === "true" || v === true || v === "1", z.boolean());
export const zUuid = z.uuid("invalid");
export const zDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate");
/** Checkbox group (`name="x[]"`) → non-empty array. */
export const zList = <T extends z.ZodType>(item: T) => z.preprocess((v) => (v == null ? [] : Array.isArray(v) ? v : [v]), z.array(item).min(1, "required"));
/** Shop location must be inside Pakistan's bounding box. */
export const zLat = z.coerce.number({ error: "location" }).min(23.5, "location").max(37.2, "location");
export const zLng = z.coerce.number({ error: "location" }).min(60.8, "location").max(77.9, "location");
