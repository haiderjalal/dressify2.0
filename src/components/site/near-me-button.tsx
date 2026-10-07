"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { LocateFixed, Loader2, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { buttonClass } from "@/components/ui/button";
import { NEARBY_RADIUS_KM } from "@/lib/constants";

export function NearMeButton({ active }: { active: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const [busy, setBusy] = useState(false);

  if (active) {
    const p = new URLSearchParams(sp.toString());
    ["lat", "lng", "near", "page"].forEach((k) => p.delete(k));
    if (p.get("sort") === "distance") p.delete("sort");
    return (
      <button type="button" className={buttonClass("emerald", "sm")} onClick={() => router.push(`/explore?${p}`)}>
        <LocateFixed /> {t("explore.nearMe", { km: NEARBY_RADIUS_KM })} <X />
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      className={buttonClass("outline", "sm")}
      onClick={() => {
        if (!("geolocation" in navigator)) return toast.error(t("explore.locationDenied"));
        setBusy(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const p = new URLSearchParams(sp.toString());
            p.set("lat", pos.coords.latitude.toFixed(5));
            p.set("lng", pos.coords.longitude.toFixed(5));
            p.set("near", "1");
            p.set("sort", "distance");
            p.delete("page");
            setBusy(false);
            router.push(`/explore?${p}`);
          },
          () => {
            setBusy(false);
            toast.message(t("explore.locationDenied"));
          },
          { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
        );
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <LocateFixed />} {busy ? t("explore.locating") : t("explore.nearMe", { km: NEARBY_RADIUS_KM })}
    </button>
  );
}
