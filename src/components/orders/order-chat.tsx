"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { subscribe, realtimeEnabled } from "@/lib/client/realtime";
import { cn, formatTime } from "@/lib/utils";

type Msg = { id: string; senderId: string; senderName: string; body: string; imageUrl: string | null; createdAt: string };

/**
 * Per-order chat. Full history is stored in Postgres; new messages arrive via
 * Pusher when configured, otherwise by polling every 4 s while visible.
 */
export function OrderChat({ orderId, meId, initial, closed, large }: { orderId: string; meId: string; initial: Msg[]; closed?: boolean; large?: boolean }) {
  const { t, locale } = useI18n();
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const last = useRef(initial.at(-1)?.createdAt ?? null);

  const merge = (incoming: Msg[]) =>
    setMsgs((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const add = incoming.filter((m) => !seen.has(m.id));
      if (!add.length) return prev;
      const next = [...prev, ...add].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      last.current = next.at(-1)!.createdAt;
      return next;
    });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  useEffect(() => {
    if (realtimeEnabled()) return subscribe(`private-order-${orderId}`, "message", (m) => merge([m as Msg]));
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const q = last.current ? `?after=${encodeURIComponent(last.current)}` : "";
      const res = await fetch(`/api/orders/${orderId}/messages${q}`, { cache: "no-store" }).catch(() => null);
      if (res?.ok) merge(((await res.json()) as { messages: Msg[] }).messages);
    };
    const id = window.setInterval(tick, 4000);
    return () => window.clearInterval(id);
  }, [orderId]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      if (res.ok) {
        merge([((await res.json()) as { message: Msg }).message]);
        setText("");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div id="chat" className="flex scroll-mt-24 flex-col overflow-hidden rounded-2xl border border-line bg-paper">
      <div ref={listRef} className={cn("flex-1 space-y-3 overflow-y-auto bg-ivory/50 p-4", large ? "h-96" : "h-80")}>
        {msgs.length === 0 && <p className="py-10 text-center text-sm text-muted">{t("chat.empty")}</p>}
        {msgs.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2", mine ? "rounded-ee-md bg-ink text-paper" : "rounded-es-md border border-line bg-paper", large && "text-lg")}>
                {!mine && <p className="mb-0.5 text-xs font-medium text-gold-deep">{m.senderName}</p>}
                <p className="break-words whitespace-pre-wrap">{m.body}</p>
                <p className={cn("mt-1 text-end text-[10px]", mine ? "text-paper/60" : "text-faint")}>{formatTime(m.createdAt, locale)}</p>
              </div>
            </div>
          );
        })}
      </div>
      {closed ? (
        <p className="border-t border-line px-4 py-3 text-center text-xs text-muted">{t("chat.closed")}</p>
      ) : (
        <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 2000))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) send(e);
            }}
            rows={1}
            placeholder={t("chat.placeholder")}
            className={cn("max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line-strong bg-paper px-3.5 py-2.5 focus:border-ink/60 focus:outline-none", large && "text-lg")}
          />
          <button type="submit" disabled={!text.trim() || sending} className={cn("grid shrink-0 place-items-center rounded-xl bg-ink text-paper transition disabled:opacity-40", large ? "size-14" : "size-11")} aria-label={t("chat.send")}>
            {sending ? <Loader2 className="size-5 animate-spin" /> : <SendHorizontal className="size-5 rtl:rotate-180" />}
          </button>
        </form>
      )}
    </div>
  );
}
