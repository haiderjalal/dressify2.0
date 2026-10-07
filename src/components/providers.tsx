"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "sonner";
import { I18nProvider, useI18n } from "@/i18n/client";
import { subscribe, realtimeEnabled } from "@/lib/client/realtime";
import type { Locale } from "@/lib/utils";

type Session = { id: string; role: "customer" | "tailor" | "admin" } | null;
type Live = { unread: number; setUnread: (n: number) => void; session: Session };
const LiveCtx = createContext<Live>({ unread: 0, setUnread: () => {}, session: null });
export const useLive = () => useContext(LiveCtx);

export type IncomingNotification = { id: string; type: string; data: Record<string, string | number | null>; link: string | null; createdAt: string };

export function Providers({ locale, session, children }: { locale: Locale; session: Session; children: ReactNode }) {
  return (
    <I18nProvider locale={locale}>
      <LiveProvider session={session}>{children}</LiveProvider>
      <Toaster position={locale === "ur" ? "top-left" : "top-right"} dir={locale === "ur" ? "rtl" : "ltr"} richColors closeButton toastOptions={{ className: "font-sans" }} />
    </I18nProvider>
  );
}

/**
 * Live notifications: realtime via Pusher when configured, otherwise polls
 * every 15 s while the tab is visible. New items pop up as toasts.
 */
function LiveProvider({ session, children }: { session: Session; children: ReactNode }) {
  const { tx } = useI18n();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const since = useRef<string | null>(null);

  const show = useCallback(
    (n: IncomingNotification) => {
      toast(tx(`notifications.types.${n.type}.title`, n.data), {
        description: tx(`notifications.types.${n.type}.body`, n.data),
        action: n.link ? { label: "→", onClick: () => router.push(n.link!) } : undefined,
      });
      window.dispatchEvent(new CustomEvent("dfy:notification", { detail: n }));
    },
    [tx, router],
  );

  useEffect(() => {
    if (!session) return;
    let stopped = false;
    const poll = async (first = false) => {
      if (document.visibilityState !== "visible" && !first) return;
      try {
        const q = since.current ? `?since=${encodeURIComponent(since.current)}` : "?limit=1";
        const res = await fetch(`/api/notifications${q}`, { cache: "no-store" });
        if (!res.ok || stopped) return;
        const json = (await res.json()) as { items: IncomingNotification[]; unread: number; now: string };
        setUnread(json.unread);
        if (!first) json.items.slice(0, 3).reverse().forEach(show);
        since.current = json.now;
      } catch {
        /* offline — try again next tick */
      }
    };
    void poll(true);
    if (realtimeEnabled()) {
      const off = subscribe(`private-user-${session.id}`, "notification", (d) => {
        show(d as IncomingNotification);
        setUnread((u) => u + 1);
      });
      return () => {
        stopped = true;
        off();
      };
    }
    const id = window.setInterval(() => void poll(), 15_000);
    const onVis = () => document.visibilityState === "visible" && void poll();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [session, show]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return <LiveCtx.Provider value={{ unread, setUnread, session }}>{children}</LiveCtx.Provider>;
}
