import { cn, initials } from "@/lib/utils";
import { SmartImage } from "./smart-image";

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-gold-soft to-sand font-display font-semibold text-gold-deep ring-1 ring-line", className)}
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.38) }}
      aria-hidden={!src}
    >
      {src ? <SmartImage src={src} alt={name} fill sizes={`${size}px`} className="object-cover" /> : initials(name)}
    </span>
  );
}
