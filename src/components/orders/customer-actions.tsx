"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { customerOrderAction, reviewAction } from "@/server/actions/account";
import { useI18n } from "@/i18n/client";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmSubmit, SubmitButton, Textarea } from "@/components/forms/fields";
import { cn } from "@/lib/utils";

export function CustomerOrderActions({ orderId, status }: { orderId: string; status: string }) {
  const { t } = useI18n();
  return (
    <>
      {(status === "pending_payment" || status === "placed") && (
        <ActionForm action={customerOrderAction}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="action" value="cancel" />
          <ConfirmSubmit message={t("orders.cancelConfirm")} size="md">
            {t("orders.cancel")}
          </ConfirmSubmit>
        </ActionForm>
      )}
      {status === "out_for_delivery" && (
        <ActionForm action={customerOrderAction}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="action" value="confirm_received" />
          <SubmitButton variant="emerald">{t("orders.confirmReceived")}</SubmitButton>
        </ActionForm>
      )}
    </>
  );
}

export function ReviewForm({ orderId }: { orderId: string }) {
  const { t } = useI18n();
  const [rating, setRating] = useState(5);
  return (
    <ActionForm action={reviewAction} className="mt-3 space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1" role="radiogroup" aria-label={t("orders.yourRating")}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={rating === i} onClick={() => setRating(i)} className="p-0.5">
            <Star className={cn("size-8 transition", i <= rating ? "fill-gold text-gold" : "fill-line text-line")} strokeWidth={1.5} />
          </button>
        ))}
      </div>
      <Textarea name="comment" placeholder={t("orders.reviewPlaceholder")} maxLength={1000} />
      <SubmitButton>{t("orders.submitReview")}</SubmitButton>
    </ActionForm>
  );
}
