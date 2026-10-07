import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("atelier-panel", className)} {...props} />;
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h3 className="font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: "neutral" | "gold" | "emerald" | "success" | "warning" | "danger" | "info" | "dark" }) {
  const tones = {
    neutral: "bg-sand text-ink-soft",
    gold: "bg-gold-soft text-gold-deep",
    emerald: "bg-emerald-soft text-emerald",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
    dark: "bg-ink text-paper",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5", tones[tone], className)} {...props} />;
}

export function EmptyState({ icon, title, body, action, className }: { icon?: ReactNode; title: ReactNode; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-paper/60 px-6 py-14 text-center", className)}>
      {icon && <div className="mb-4 grid size-14 place-items-center rounded-xl bg-emerald-soft text-emerald [&_svg]:size-6">{icon}</div>}
      <p className="font-display text-2xl font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, eyebrow, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; eyebrow?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, icon, tone = "neutral", className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: "neutral" | "gold" | "emerald" | "warning"; className?: string }) {
  const ring = { neutral: "bg-sand text-ink", gold: "bg-gold-soft text-gold-deep", emerald: "bg-emerald-soft text-emerald", warning: "bg-warning-soft text-warning" }[tone];
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{label}</p>
        {icon && <span className={cn("grid size-9 place-items-center rounded-full [&_svg]:size-4.5", ring)}>{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
