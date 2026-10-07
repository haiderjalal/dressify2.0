"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { buttonClass, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { useFormCtx } from "./action-form";

const control =
  "w-full rounded-xl border border-line-strong bg-paper px-3.5 text-ink placeholder:text-faint shadow-[inset_0_1px_2px_rgb(35_78_66_/_0.025)] transition-colors hover:border-emerald/40 focus:border-emerald focus:outline-none focus:ring-4 focus:ring-emerald/10 disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Field({ label, name, hint, children, className, optional }: { label?: ReactNode; name?: string; hint?: ReactNode; children: ReactNode; className?: string; optional?: boolean }) {
  const { tx, t } = useI18n();
  const { state } = useFormCtx();
  const err = name && state && !state.ok ? state.fieldErrors?.[name] : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-ink-soft">
          {label}
          {optional && <span className="ms-1 font-normal text-faint">({t("common.optional")})</span>}
        </label>
      )}
      {children}
      {err ? <p className="text-sm text-danger">{tx(`errors.${err}`)}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function useInvalid(name?: string) {
  const { state } = useFormCtx();
  return Boolean(name && state && !state.ok && state.fieldErrors?.[name]);
}

export function Input({ className, size = "md", ...props }: Omit<ComponentProps<"input">, "size"> & { size?: "md" | "lg" }) {
  const invalid = useInvalid(props.name);
  return <input id={props.id ?? props.name} aria-invalid={invalid || undefined} className={cn(control, size === "lg" ? "h-14 text-lg" : "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  const invalid = useInvalid(props.name);
  return <textarea id={props.id ?? props.name} aria-invalid={invalid || undefined} className={cn(control, "min-h-24 py-2.5", className)} {...props} />;
}

export function Select({ className, size = "md", ...props }: Omit<ComponentProps<"select">, "size"> & { size?: "md" | "lg" }) {
  const invalid = useInvalid(props.name);
  return <select id={props.id ?? props.name} aria-invalid={invalid || undefined} className={cn(control, "appearance-none bg-[length:16px] bg-[position:right_0.9rem_center] bg-no-repeat pe-9 rtl:bg-[position:left_0.9rem_center]", size === "lg" ? "h-14 text-lg" : "h-11", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2370685c' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props} />;
}

/** Pill-style checkbox — easier to tap than a small box. */
export function CheckChip({ name, value, label, defaultChecked, className }: { name: string; value: string; label: ReactNode; defaultChecked?: boolean; className?: string }) {
  return (
    <label className={cn("cursor-pointer select-none", className)}>
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-paper px-3.5 py-1.5 text-sm text-ink-soft transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-gold">
        {label}
      </span>
    </label>
  );
}

export function Toggle({ name, label, hint, defaultChecked }: { name: string; label: ReactNode; hint?: ReactNode; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper p-3.5 transition-colors hover:border-line-strong">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full bg-line-strong transition-colors peer-checked:bg-emerald peer-focus-visible:ring-2 peer-focus-visible:ring-gold after:absolute after:start-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4 rtl:peer-checked:after:-translate-x-4" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function SubmitButton({ children, variant = "primary", size = "md", className, pendingText, name, value, formNoValidate }: { children: ReactNode; variant?: ButtonVariant; size?: ButtonSize; className?: string; pendingText?: ReactNode; name?: string; value?: string; formNoValidate?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} formNoValidate={formNoValidate} disabled={pending} aria-busy={pending} className={buttonClass(variant, size, className)}>
      {pending && <Loader2 className="animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

/** Submit button that asks for confirmation first (destructive actions). */
export function ConfirmSubmit({ children, message, variant = "danger-outline", size = "sm", className }: { children: ReactNode; message: string; variant?: ButtonVariant; size?: ButtonSize; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass(variant, size, className)}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </button>
  );
}
