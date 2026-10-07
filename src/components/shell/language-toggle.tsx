"use client";

import { Languages } from "lucide-react";
import { useTransition } from "react";
import { setLocaleAction } from "@/server/actions/auth";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className, large }: { className?: string; large?: boolean }) {
  const { locale, t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("locale", locale === "ur" ? "en" : "ur");
          await setLocaleAction(fd);
        })
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line px-3 text-ink-soft transition-colors hover:border-line-strong hover:bg-paper disabled:opacity-50",
        large ? "h-12 px-4 text-base" : "h-9 text-sm",
        className,
      )}
      aria-label={t("common.language")}
    >
      <Languages className="size-4" />
      <span className={locale === "en" ? "font-urdu" : ""}>{t("common.switchLanguage")}</span>
    </button>
  );
}
