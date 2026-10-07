import en, { type Dictionary } from "./en";
import ur from "./ur";
import type { Locale } from "@/lib/utils";

export const LOCALES = ["en", "ur"] as const;
export const LOCALE_COOKIE = "dfy_locale";
export const dictionaries: Record<Locale, Dictionary> = { en, ur: ur as Dictionary };

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Every valid translation key, e.g. "booking.title". Typos are compile errors. */
export type TKey = Leaves<Dictionary>;
export type Vars = Record<string, string | number | null | undefined>;

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "ur";
}

function lookup(dict: Dictionary, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(str: string, vars?: Vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] == null ? "" : String(vars[k])));
}

export function makeTranslator(locale: Locale) {
  const dict = dictionaries[locale];
  /** Type-checked keys. */
  const t = (key: TKey, vars?: Vars) => interpolate(lookup(dict, key) ?? lookup(en, key) ?? key, vars);
  /** Dynamic keys (e.g. built from DB values); falls back to the last key segment. */
  const tx = (key: string, vars?: Vars) => interpolate(lookup(dict, key) ?? lookup(en, key) ?? key.split(".").pop() ?? key, vars);
  return { t, tx, locale, dir: (locale === "ur" ? "rtl" : "ltr") as "rtl" | "ltr" };
}

export type Translator = ReturnType<typeof makeTranslator>;
