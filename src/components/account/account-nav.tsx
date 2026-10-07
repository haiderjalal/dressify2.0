"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AccountNav({ items }: { items: { href: string; label: string; key: string }[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/account" ? path === "/account" : path.startsWith(href));
  return (
    <nav className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1">
      {items.map((it) => (
        <Link key={it.key} href={it.href} aria-current={active(it.href) ? "page" : undefined} className={cn("flex min-h-11 items-center rounded-lg px-4 text-sm whitespace-nowrap transition", active(it.href) ? "bg-emerald text-paper" : "text-ink-soft hover:bg-sand")}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
