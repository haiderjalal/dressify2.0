"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function b64ToUint8(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "unknown" | "unavailable" | "denied" | "off" | "on" | "busy";

/** Opt-in for device push notifications (pop-ups even when the app is closed). */
export function PushCard({ large }: { large?: boolean }) {
  const { t } = useI18n();
  const [state, setState] = useState<State>("unknown");
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!key || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unavailable");
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker.getRegistration("/sw.js").then(async (reg) => setState((await reg?.pushManager.getSubscription()) ? "on" : "off"));
  }, [key]);

  const enable = async () => {
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(key!) }));
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  };

  return (
    <Card className={large ? "p-6" : "p-5"}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-soft text-gold-deep">
          <BellRing className="size-5" />
        </span>
        <div>
          <p className={large ? "text-lg font-semibold" : "font-semibold"}>{t("account.pushTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("account.pushBody")}</p>
        </div>
      </div>
      <div className="mt-4">
        {state === "on" && <p className="text-sm text-success">{t("account.pushEnabled")}</p>}
        {state === "denied" && <p className="text-sm text-danger">{t("account.pushDenied")}</p>}
        {state === "unavailable" && <p className="text-sm text-muted">{t("account.pushUnavailable")}</p>}
        {(state === "off" || state === "busy") && (
          <Button onClick={enable} disabled={state === "busy"} size={large ? "xl" : "md"} variant="gold" className="w-full">
            {state === "busy" && <Loader2 className="animate-spin" />} {t("account.pushEnable")}
          </Button>
        )}
      </div>
    </Card>
  );
}
