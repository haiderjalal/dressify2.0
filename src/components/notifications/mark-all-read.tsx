"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useLive } from "@/components/providers";
import { Button } from "@/components/ui/button";

export function MarkAllRead() {
  const { t } = useI18n();
  const { setUnread } = useLive();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
          setUnread(0);
          router.refresh();
        })
      }
    >
      <CheckCheck /> {t("notifications.markAllRead")}
    </Button>
  );
}
