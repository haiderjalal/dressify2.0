import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, Bike, CheckCircle2, FileText, MapPin, Phone, Ruler } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { getOrderDetail } from "@/server/modules/orders/service";
import { listMessages } from "@/server/modules/chat/service";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Stars } from "@/components/ui/stars";
import { MeasurementGrid, OrderItems, OrderTimeline, StatusBadge } from "@/components/orders/order-bits";
import { OrderChat } from "@/components/orders/order-chat";
import { CustomerOrderActions, ReviewForm } from "@/components/orders/customer-actions";
import { PAYMENT_HOLD_MINUTES } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Order" };

export default async function CustomerOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string; payment?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await requireUser("customer");
  const detail = await getOrderDetail(user, id);
  if (!detail || detail.order.customerId !== user.id) notFound();
  const i18n = await getI18n();
  const { t, tx, locale } = i18n;
  const { order, tailor, items, events, review } = detail;
  const messages = await listMessages(user, id);
  const closed = order.status === "delivered" || order.status === "cancelled";

  const banner =
    sp.payment === "success" || sp.placed
      ? { tone: "success", text: sp.payment === "success" ? t("payment.success") : t("status.placed") }
      : sp.payment === "failed" || sp.payment === "unavailable"
        ? { tone: "danger", text: sp.payment === "failed" ? t("payment.failed") : t("errors.paymentUnavailable") }
        : null;

  return (
    <div className="space-y-6">
      {banner && (
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${banner.tone === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
          {banner.tone === "success" ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />} {banner.text}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            <Link href={`/tailors/${tailor.slug}`} className="hover:text-ink">
              {tailor.shopName}
            </Link>{" "}
            · {t("orders.placedOn", { date: formatDate(order.createdAt, locale) })}
          </p>
          <h1 className="mt-1 font-display text-4xl font-medium">{t("orders.order", { number: order.number })}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge t={i18n} status={order.status} />
            <Badge tone={order.paymentStatus === "paid" ? "success" : order.paymentStatus === "failed" ? "danger" : "neutral"}>
              {t(`payment.${order.paymentMethod}`)} · {t(`paymentStatus.${order.paymentStatus}`)}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.status === "pending_payment" && <LinkButton href={`/pay/${order.id}`} variant="emerald">{t("orders.payNow")}</LinkButton>}
          <LinkButton href={`/invoice/${order.id}`} variant="outline" size="md">
            <FileText /> {t("orders.invoice")}
          </LinkButton>
          <CustomerOrderActions orderId={order.id} status={order.status} />
        </div>
      </div>

      {order.status === "pending_payment" && <p className="rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning">{t("orders.awaitingPayment", { n: PAYMENT_HOLD_MINUTES })}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title={t("orders.timeline")} subtitle={order.fabricSource === "own" ? t("orders.fabricOwn") : t("orders.fabricStore")} />
            <div className="p-5">
              <OrderTimeline t={i18n} status={order.status} fabricSource={order.fabricSource} events={events} />
              {order.cancelledBy && <p className="mt-4 text-sm text-danger">{t("orders.cancelledBy", { who: tx(`roles.${order.cancelledBy}`) })}{order.cancelReason && order.cancelReason !== "payment_timeout" ? ` — ${order.cancelReason}` : ""}</p>}
            </div>
          </Card>

          <section>
            <h2 className="mb-3 font-semibold">{t("chat.title")}</h2>
            <OrderChat orderId={order.id} meId={user.id} initial={messages} closed={closed} />
          </section>

          {order.status === "delivered" && (
            <Card className="p-5">
              <h2 className="font-semibold">{t("orders.review")}</h2>
              {review ? (
                <div className="mt-3">
                  <Stars value={review.rating} size={18} />
                  {review.comment && <p className="mt-2 text-sm text-ink-soft">“{review.comment}”</p>}
                </div>
              ) : (
                <ReviewForm orderId={order.id} />
              )}
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-2 font-semibold">{t("orders.items")}</h2>
            <OrderItems t={i18n} items={items} money={order} />
          </Card>
          <Card className="space-y-4 p-5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{t("orders.slot")}</span>
              <span className="font-medium">{formatDate(order.slotDate, locale, { weekday: "short", day: "numeric", month: "short" })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t("orders.due")}</span>
              <span className="font-medium">{formatDate(order.dueDate, locale, { weekday: "short", day: "numeric", month: "short" })}</span>
            </div>
            <div className="border-t border-line pt-4">
              <p className="flex items-center gap-1.5 text-muted"><MapPin className="size-4" /> {t("orders.address")}</p>
              <p className="mt-1">{order.address.name} · <span dir="ltr">{order.address.phone}</span></p>
              <p className="text-muted">{[order.address.line1, order.address.area, order.address.city].filter(Boolean).join(", ")}</p>
            </div>
            {(order.pickupRider || order.deliveryRider) && (
              <div className="space-y-2 border-t border-line pt-4">
                {order.pickupRider && (
                  <p className="flex items-center gap-2"><Bike className="size-4 text-gold" /> {t("orders.pickupRider")}: {order.pickupRider.name} · <a href={`tel:${order.pickupRider.phone}`} className="underline" dir="ltr">{order.pickupRider.phone}</a></p>
                )}
                {order.deliveryRider && (
                  <p className="flex items-center gap-2"><Bike className="size-4 text-gold" /> {t("orders.deliveryRider")}: {order.deliveryRider.name} · <a href={`tel:${order.deliveryRider.phone}`} className="underline" dir="ltr">{order.deliveryRider.phone}</a></p>
                )}
              </div>
            )}
            {tailor.phone && (
              <a href={`tel:${tailor.phone}`} className="flex items-center gap-2 border-t border-line pt-4 text-ink-soft hover:text-ink">
                <Phone className="size-4" /> {tailor.shopName} · <span dir="ltr">{tailor.phone}</span>
              </a>
            )}
          </Card>
          <Card className="p-5">
            <p className="mb-3 flex items-center gap-1.5 font-semibold"><Ruler className="size-4 text-gold" /> {t("orders.measurements")} · {order.measurements.profileName}</p>
            <MeasurementGrid t={i18n} values={order.measurements.values} />
            {order.notes && <p className="mt-3 rounded-xl bg-sand/50 p-3 text-sm"><b>{t("orders.notes")}:</b> {order.notes}</p>}
          </Card>
          <p className="text-center text-xs text-faint">{formatDateTime(order.updatedAt, locale)}</p>
        </aside>
      </div>
    </div>
  );
}
