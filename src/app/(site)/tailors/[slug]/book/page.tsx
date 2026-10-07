import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getPublicTailor } from "@/server/modules/tailors/queries";
import { getAvailability } from "@/server/modules/tailors/availability";
import { listAddresses, listMeasurements } from "@/server/modules/customers/service";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { EmptyState } from "@/components/ui/card";
import { BOOKING_WINDOW_DAYS } from "@/lib/constants";
import { env } from "@/server/env";

export const metadata: Metadata = { title: "Book a stitching slot" };

export default async function BookPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ design?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await requireUser("customer", `/tailors/${slug}/book${sp.design ? `?design=${sp.design}` : ""}`);
  const [data, { t }] = await Promise.all([getPublicTailor(slug), getI18n()]);
  if (!data) notFound();
  const { profile, designs, fabrics } = data;
  const [slots, measurements, addresses] = await Promise.all([getAvailability(profile, BOOKING_WINDOW_DAYS), listMeasurements(user.id), listAddresses(user.id)]);

  if (designs.length === 0) return <div className="container-x py-16"><EmptyState title={t("tailor.notAvailable")} /></div>;

  return (
    <div className="container-x py-8 lg:py-12">
      <p className="eyebrow">{t("tailor.bookNow")}</p>
      <h1 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">{t("booking.title", { tailor: profile.shopName })}</h1>
      <BookingWizard
        tailor={{ id: profile.id, shopName: profile.shopName, slug: profile.slug }}
        designs={designs.map((d) => ({ id: d.id, title: d.title, category: d.category, audience: d.audience, price: d.price, durationDays: d.durationDays, image: d.images[0] ?? null }))}
        fabrics={fabrics.filter((f) => f.stockMeters > 0).map((f) => ({ id: f.id, name: f.name, material: f.material, colorName: f.colorName, colorHex: f.colorHex, pricePerMeter: f.pricePerMeter, stockMeters: f.stockMeters, imageUrl: f.imageUrl }))}
        slots={slots}
        measurements={measurements.map((m) => ({ id: m.id, name: m.name, gender: m.gender, values: m.values }))}
        addresses={addresses.map((a) => ({ id: a.id, label: a.label, line1: a.line1, area: a.area, city: a.city, isDefault: a.isDefault }))}
        user={{ name: user.name, phone: user.phone ?? "" }}
        preselect={sp.design}
        testMode={env.PAYMENTS_MODE === "test"}
      />
    </div>
  );
}
