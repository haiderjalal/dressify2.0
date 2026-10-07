"use client";

import { createContext, useActionState, useContext, useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";

export type ActionState =
  | { ok: true; message?: string; data?: unknown; at?: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; at?: number }
  | null;

type FormCtx = { state: ActionState; pending: boolean };
const Ctx = createContext<FormCtx>({ state: null, pending: false });
export const useFormCtx = () => useContext(Ctx);

const SUCCESS_KEYS: Record<string, string> = {
  saved: "common.saved",
  passwordChanged: "account.passwordChanged",
  reviewThanks: "orders.reviewThanks",
  requested: "appointments.requested",
  shopSaved: "dash.shopSaved",
};

/**
 * Wraps a server action with useActionState: shows translated toasts, exposes
 * field errors to <Field>, and keeps working without JS (progressive enhancement).
 */
export function ActionForm({
  action,
  children,
  className,
  silent,
  resetOnSuccess,
  onDone,
  ...rest
}: Omit<ComponentProps<"form">, "action" | "children"> & {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  /** Don't toast on success (e.g. +/- buttons). */
  silent?: boolean;
  resetOnSuccess?: boolean;
  onDone?: (state: NonNullable<ActionState>) => void;
}) {
  const { tx } = useI18n();
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      if (!silent && state.message) toast.success(tx(SUCCESS_KEYS[state.message] ?? `common.${state.message}`));
      if (resetOnSuccess) ref.current?.reset();
    } else {
      // Toast unless every field error is already shown next to a field in this form.
      const keys = Object.keys(state.fieldErrors ?? {});
      const shownInline = keys.length > 0 && keys.every((k) => ref.current?.querySelector(`[name="${CSS.escape(k)}"], [name="${CSS.escape(k)}[]"]`));
      if (!shownInline) toast.error(tx(`errors.${keys.length ? state.fieldErrors![keys[0]] : state.error}`));
    }
    onDoneRef.current?.(state);
    // `at` changes on every submission so repeated identical results still fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.at]);

  return (
    <Ctx.Provider value={{ state, pending }}>
      <form ref={ref} action={formAction} className={className} {...rest}>
        {children}
      </form>
    </Ctx.Provider>
  );
}
