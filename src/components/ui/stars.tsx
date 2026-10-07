import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={i <= Math.round(value) ? "fill-gold text-gold" : "fill-line text-line"} strokeWidth={1.5} />
      ))}
    </span>
  );
}
