/**
 * Domain errors carry an i18n key (errors.*) so the UI can show a translated
 * message. Anything that is not an AppError is logged and shown as "generic"
 * — internal details never leak to the browser.
 */
export type ErrorCode =
  | "required"
  | "invalid"
  | "emailTaken"
  | "phoneTaken"
  | "invalidCredentials"
  | "accountDisabled"
  | "rateLimited"
  | "notFound"
  | "forbidden"
  | "slotFull"
  | "dayClosed"
  | "invalidDate"
  | "outOfStock"
  | "invalidTransition"
  | "fileTooLarge"
  | "fileType"
  | "tailorUnavailable"
  | "paymentUnavailable"
  | "alreadyReviewed"
  | "wrongPassword"
  | "location"
  | "generic";

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public status = 400,
  ) {
    super(code);
    this.name = "AppError";
  }
}

export const notFound = () => new AppError("notFound", 404);
export const forbidden = () => new AppError("forbidden", 403);

/** Unwraps Postgres errors (drizzle wraps driver errors in `cause`). */
export function pgError(e: unknown): { code?: string; constraint?: string } {
  const err = e as { code?: string; constraint_name?: string; cause?: { code?: string; constraint_name?: string } };
  const src = err?.constraint_name || err?.code ? err : err?.cause;
  return { code: src?.code, constraint: src?.constraint_name };
}
