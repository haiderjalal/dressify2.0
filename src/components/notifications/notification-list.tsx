import Link from "next/link";
import { Bell } from "lucide-react";
import type { Translator } from "@/i18n/core";
import { EmptyState } from "@/components/ui/card";
import { cn, formatDateTime } from "@/lib/utils";
import { MarkAllRead } from "./mark-all-read";

type N = { id: string; type: string; data: Record<string, string | number | null>; link: string | null; readAt: Date | null; createdAt: Date };

export function NotificationList({ t, items, large }: { t: Translator; items: N[]; large?: boolean }) {
  if (items.length === 0) return <EmptyState icon={<Bell />} title={t.t("notifications.empty")} />;
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <MarkAllRead />
      </div>
      <ul className="overflow-hidden rounded-2xl border border-line bg-paper shadow-soft">
        {items.map((n) => {
          const body = (
            <div className={cn("flex gap-4 border-b border-line p-4 last:border-0", !n.readAt && "bg-gold-soft/25")}>
              <span className={cn("mt-2 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-gold")} />
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", large && "text-lg")}>{t.tx(`notifications.types.${n.type}.title`, n.data)}</p>
                <p className={cn("text-muted", large ? "text-base" : "text-sm")}>{t.tx(`notifications.types.${n.type}.body`, n.data)}</p>
                <p className="mt-1 text-xs text-faint">{formatDateTime(n.createdAt, t.locale)}</p>
              </div>
            </div>
          );
          return <li key={n.id}>{n.link ? <Link href={n.link} className="block hover:bg-sand/30">{body}</Link> : body}</li>;
        })}
      </ul>
    </div>
  );
}
