"use client";

import { useEffect } from "react";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[60vh] place-items-center p-6 text-center">
      <div>
        <h1 className="font-display text-3xl">{t("common.errorTitle")}</h1>
        <p className="mt-2 text-muted">{t("common.errorBody")}</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-faint">{error.digest}</p>}
        <Button onClick={reset} className="mt-6">{t("common.tryAgain")}</Button>
      </div>
    </main>
  );
}
