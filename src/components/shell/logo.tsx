import Link from "next/link";
import { cn } from "@/lib/utils";

/** Wordmark: needle-and-thread monogram + serif name. */
export function Logo({ href = "/", className, light }: { href?: string; className?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="Dressify home">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="15" className={light ? "fill-paper" : "fill-ink"} />
        <path d="M10.5 22.5 21 9" stroke="#c9a463" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="21.6" cy="8.3" r="1.5" fill="none" stroke="#c9a463" strokeWidth="1.2" />
        <path d="M9 13.5c3.5-1.8 8.5 4.2 13.5 2.4" fill="none" stroke={light ? "#17140f" : "#f8f5ef"} strokeWidth="1.3" strokeLinecap="round" strokeDasharray="1.6 1.8" />
      </svg>
      <span className={cn("font-display text-[1.6rem] leading-none font-semibold tracking-tight", light ? "text-paper" : "text-ink")} style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
        Dressify
      </span>
    </Link>
  );
}
