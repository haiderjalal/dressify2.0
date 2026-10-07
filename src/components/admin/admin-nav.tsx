"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="scrollbar-none flex gap-1 overflow-x-auto">
      {items.map((it) => {
        const on = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined} className={cn("flex min-h-11 items-center rounded-lg px-4 text-sm whitespace-nowrap transition", on ? "bg-emerald text-paper" : "text-ink-soft hover:bg-sand")}>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
