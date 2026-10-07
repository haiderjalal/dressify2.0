"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useLive } from "@/components/providers";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function NotificationBell({ href, className, large }: { href: string; className?: string; large?: boolean }) {
  const { unread } = useLive();
  const { t } = useI18n();
  return (
    <Link
      href={href}
      aria-label={t("nav.notifications")}
      className={cn("relative grid place-items-center rounded-full text-ink-soft transition-colors hover:bg-sand", large ? "size-12" : "size-10", className)}
    >
      <Bell className={large ? "size-6" : "size-5"} />
      {unread > 0 && (
        <span className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] leading-5 font-semibold text-white tabular-nums">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
