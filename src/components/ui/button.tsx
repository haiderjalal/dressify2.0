import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-emerald text-paper hover:bg-emerald/90 shadow-sm",
  emerald: "bg-emerald text-paper hover:bg-emerald/90 shadow-sm",
  gold: "bg-gold text-paper hover:bg-gold-deep shadow-sm",
  outline: "border border-line-strong bg-paper text-ink hover:border-ink/40 hover:bg-sand/40",
  ghost: "text-ink hover:bg-sand/70",
  danger: "bg-danger text-white hover:bg-danger/90",
  "danger-outline": "border border-danger/40 text-danger hover:bg-danger-soft",
  light: "bg-paper/90 text-ink hover:bg-paper backdrop-blur",
} as const;

const sizes = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-5 text-[15px] gap-2 rounded-xl",
  lg: "h-13 px-7 text-base gap-2.5 rounded-xl",
  /** Tailor dashboard: large, thumb-friendly targets */
  xl: "min-h-14 px-6 text-lg gap-3 rounded-2xl font-semibold",
  icon: "h-10 w-10 rounded-full",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition duration-200 active:translate-y-px select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.1em]",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({ variant, size, className, type = "button", ...props }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
