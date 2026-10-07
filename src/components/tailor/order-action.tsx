"use client";

import { useState } from "react";
import { Bike, CheckCircle2, PackageCheck, Scissors, Sparkles, ThumbsUp, Truck, X } from "lucide-react";
import { tailorOrderAction } from "@/server/actions/tailor";
import { useI18n } from "@/i18n/client";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmSubmit, Field, Input, SubmitButton } from "@/components/forms/fields";
import type { TKey } from "@/i18n/core";

type Action = "accept" | "schedule_pickup" | "mark_picked" | "start_stitching" | "mark_ready" | "dispatch" | "mark_delivered";

const META: Record<Action, { label: TKey; icon: typeof Bike }> = {
  accept: { label: "dash.accept", icon: ThumbsUp },
  schedule_pickup: { label: "dash.schedulePickup", icon: Bike },
  mark_picked: { label: "dash.markPicked", icon: PackageCheck },
  start_stitching: { label: "dash.startStitching", icon: Scissors },
  mark_ready: { label: "dash.markReady", icon: Sparkles },
  dispatch: { label: "dash.dispatch", icon: Truck },
  mark_delivered: { label: "dash.markDelivered", icon: CheckCircle2 },
};

/**
 * The one big "next step" button for an order. Steps that send a rider ask for
 * the rider's name and phone (remembered on this device for next time).
 */
export function TailorOrderAction({ orderId, action, canDecline, compact }: { orderId: string; action: Action | null; canDecline?: boolean; compact?: boolean }) {
  const { t } = useI18n();
  const needsRider = action === "schedule_pickup" || action === "dispatch";
  const [open, setOpen] = useState(false);
  const saved = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("dfy:rider") ?? "{}") : {};
  if (!action) return null;
  const { label, icon: Icon } = META[action];

  return (
    <div className="space-y-3">
      {needsRider && !open ? (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald px-6 text-lg font-semibold text-paper shadow-sm active:scale-[0.99]">
          <Icon className="size-6" /> {t(label)}
        </button>
      ) : (
        <ActionForm
          action={tailorOrderAction}
          className="space-y-3"
          onDone={(s) => {
            if (s.ok) setOpen(false);
          }}
        >
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="action" value={action} />
          {needsRider && (
            <div className="grid gap-3 rounded-2xl border border-line bg-sand/40 p-4 sm:grid-cols-2">
              <Field label={t("dash.riderName")} name="riderName">
                <Input name="riderName" size="lg" required defaultValue={saved.name ?? ""} onBlur={(e) => localStorage.setItem("dfy:rider", JSON.stringify({ ...saved, name: e.target.value }))} />
              </Field>
              <Field label={t("dash.riderPhone")} name="riderPhone">
                <Input name="riderPhone" size="lg" type="tel" dir="ltr" required defaultValue={saved.phone ?? ""} onBlur={(e) => localStorage.setItem("dfy:rider", JSON.stringify({ ...saved, phone: e.target.value }))} />
              </Field>
            </div>
          )}
          <SubmitButton variant="emerald" size="xl" className="w-full">
            <Icon className="size-6" /> {t(label)}
          </SubmitButton>
        </ActionForm>
      )}
      {canDecline && action === "accept" && !compact && (
        <ActionForm action={tailorOrderAction}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="action" value="decline" />
          <ConfirmSubmit message={t("dash.declineConfirm")} variant="ghost" size="lg" className="w-full text-danger">
            <X /> {t("dash.decline")}
          </ConfirmSubmit>
        </ActionForm>
      )}
    </div>
  );
}
