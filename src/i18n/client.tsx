"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { makeTranslator, type Translator } from "./core";
import type { Locale } from "@/lib/utils";

const I18nContext = createContext<Translator | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => makeTranslator(locale), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
