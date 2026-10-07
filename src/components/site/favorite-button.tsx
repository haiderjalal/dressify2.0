"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toggleFavoriteAction } from "@/server/actions/account";
import { useI18n } from "@/i18n/client";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavoriteButton({ tailorId, saved, signedIn, path }: { tailorId: string; saved: boolean; signedIn: boolean; path: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      className={buttonClass("outline", "lg", cn(optimistic && "border-gold text-gold-deep"))}
      onClick={() => {
        if (!signedIn) return router.push(`/login?next=${encodeURIComponent(path)}`);
        start(async () => {
          setOptimistic(!optimistic);
          const fd = new FormData();
          fd.set("tailorId", tailorId);
          fd.set("path", path);
          await toggleFavoriteAction(null, fd);
          router.refresh();
        });
      }}
    >
      <Heart className={cn(optimistic && "fill-current")} />
      <span className="hidden sm:inline">{optimistic ? t("tailor.savedTailor") : t("tailor.save")}</span>
    </button>
  );
}
