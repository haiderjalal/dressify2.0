import Link from "next/link";
import { cn } from "@/lib/utils";

/** URL-driven tabs (shareable, back-button friendly, no client JS). */
export function LinkTabs({ items, active, size = "md", className }: { items: { href: string; label: React.ReactNode; key: string; count?: number }[]; active: string; size?: "md" | "lg"; className?: string }) {
  return (
    <nav className={cn("scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1", className)}>
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          aria-current={active === it.key ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-xl border whitespace-nowrap transition-colors",
            size === "lg" ? "px-5 py-2.5 text-base font-medium" : "px-4 py-1.5 text-sm",
            active === it.key ? "border-emerald bg-emerald text-paper" : "border-line bg-paper text-ink-soft hover:border-line-strong",
          )}
        >
          {it.label}
          {typeof it.count === "number" && it.count > 0 && (
            <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active === it.key ? "bg-paper/20" : "bg-sand")}>{it.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
