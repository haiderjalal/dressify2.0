import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bike, FileText, MapPin, MessageCircle, Phone, Ruler } from "lucide-react";
import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { getOrderDetail } from "@/server/modules/orders/service";
import { tailorNextAction } from "@/server/modules/orders/state";
import { listMessages } from "@/server/modules/chat/service";
import { MeasurementGrid, OrderItems, OrderTimeline, StatusBadge } from "@/components/orders/order-bits";
import { OrderChat } from "@/components/orders/order-chat";
import { TailorOrderAction } from "@/components/tailor/order-action";
import { buttonClass } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Order" };

export default async function TailorOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { user, tailor } = await requireTailor();
  const detail = await getOrderDetail(user, id);
  if (!detail || detail.order.tailorId !== tailor.id) notFound();
  const i18n = await getI18n();
  const { t, locale } = i18n;
  const { order, customer, items, events } = detail;
  const messages = await listMessages(user, id);
  const next = tailorNextAction(order.status, order.fabricSource);
  const a = order.address;
  const mapsUrl = a.lat && a.lng ? `https://www.google.com/maps?q=${a.lat},${a.lng}` : `https://www.google.com/maps/search/${encodeURIComponent([a.line1, a.area, a.city].filter(Boolean).join(", "))}`;
  const closed = order.status === "delivered" || order.status === "cancelled";

  return (
    <div className="space-y-6">
      <Link href="/tailor/orders" className="inline-flex items-center gap-2 text-base text-muted hover:text-ink">
        <ArrowLeft className="size-5 rtl:rotate-180" /> {t("dash.nav.orders")}
      </Link>

      <div className="rounded-3xl border border-line bg-paper p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusBadge t={i18n} status={order.status} className="px-3 py-1 text-base" />
            <h1 className="mt-3 text-3xl font-semibold">{customer.name}</h1>
            <p className="mt-1 text-lg text-muted">
              <span className="font-mono">{order.number}</span> · {t("orders.due")}: <b className="text-ink">{formatDate(order.dueDate, locale, { weekday: "long", day: "numeric", month: "long" })}</b>
            </p>
          </div>
          <div className="text-end">
            <p className="text-sm text-muted">{t("booking.total")}</p>
            <p className="text-3xl font-semibold tabular-nums">{formatPrice(order.tailorPayout, locale)}</p>
            <p className="text-sm text-muted">{t(`payment.${order.paymentMethod}`)} · {t(`paymentStatus.${order.paymentStatus}`)}</p>
          </div>
        </div>
        {next && (
          <div className="mt-6 border-t border-line pt-6">
            <p className="mb-3 text-base font-medium text-muted">{t("dash.nextStep")}</p>
            <TailorOrderAction orderId={order.id} action={next} canDecline />
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-line bg-paper p-6 shadow-soft">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <Ruler className="size-6 text-gold" /> {t("orders.measurements")} — {order.measurements.profileName}
            </h2>
            <MeasurementGrid t={i18n} values={order.measurements.values} large />
            {order.measurements.notes && <p className="mt-4 rounded-2xl bg-sand/60 p-4 text-lg">{order.measurements.notes}</p>}
            {order.notes && (
              <p className="mt-4 rounded-2xl bg-gold-soft/60 p-4 text-lg">
                <b>{t("orders.notes")}:</b> {order.notes}
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
              <MessageCircle className="size-6 text-gold" /> {t("chat.title")}
            </h2>
            <OrderChat orderId={order.id} meId={user.id} initial={messages} closed={closed} large />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="space-y-3 rounded-3xl border border-line bg-paper p-6 shadow-soft">
            {(a.phone || customer.phone) && (
              <a href={`tel:${a.phone || customer.phone}`} className={buttonClass("outline", "xl", "w-full")}>
                <Phone className="size-6" /> {t("dash.customerPhone")}
              </a>
            )}
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 rounded-2xl bg-sand/50 p-4 text-base">
              <MapPin className="mt-0.5 size-6 shrink-0 text-gold" />
              <span>
                {a.name} · <span dir="ltr">{a.phone}</span>
                <br />
                <span className="text-muted">{[a.line1, a.area, a.city].filter(Boolean).join(", ")}</span>
              </span>
            </a>
            {order.pickupRider && (
              <p className="flex items-center gap-2 text-base">
                <Bike className="size-5 text-gold" /> {t("orders.pickupRider")}: {order.pickupRider.name} (<span dir="ltr">{order.pickupRider.phone}</span>)
              </p>
            )}
            {order.deliveryRider && (
              <p className="flex items-center gap-2 text-base">
                <Bike className="size-5 text-gold" /> {t("orders.deliveryRider")}: {order.deliveryRider.name} (<span dir="ltr">{order.deliveryRider.phone}</span>)
              </p>
            )}
            <p className="text-base">
              {t("orders.slot")}: <b>{formatDate(order.slotDate, locale, { weekday: "short", day: "numeric", month: "short" })}</b> · {order.fabricSource === "own" ? t("orders.fabricOwn") : t("orders.fabricStore")}
            </p>
          </section>

          <section className="rounded-3xl border border-line bg-paper p-6 shadow-soft">
            <h2 className="mb-2 text-xl font-semibold">{t("orders.items")}</h2>
            <OrderItems t={i18n} items={items} money={order} />
            <Link href={`/invoice/${order.id}`} className={buttonClass("ghost", "md", "mt-3 w-full")}>
              <FileText /> {t("orders.invoice")}
            </Link>
          </section>

          <section className="rounded-3xl border border-line bg-paper p-6 shadow-soft">
            <h2 className="mb-4 text-xl font-semibold">{t("orders.timeline")}</h2>
            <OrderTimeline t={i18n} status={order.status} fabricSource={order.fabricSource} events={events} />
          </section>
        </aside>
      </div>
    </div>
  );
}
