import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE, makeTranslator } from "./core";
import type { Locale } from "@/lib/utils";

/** Locale from cookie (set by the language toggle). Cached per request. */
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : "en";
});

export const getI18n = cache(async () => makeTranslator(await getLocale()));
