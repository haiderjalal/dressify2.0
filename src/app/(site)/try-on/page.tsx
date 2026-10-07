import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { getTryOnDesigns } from "@/server/modules/tailors/queries";
import { PageHeader } from "@/components/ui/card";
import { SmartImage } from "@/components/ui/smart-image";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Virtual try-on" };

export default async function TryOnGallery() {
  const [{ t, tx, locale }, designs] = await Promise.all([getI18n(), getTryOnDesigns(48)]);
  return (
    <div className="container-x py-10">
      <PageHeader eyebrow={t("tryon.title")} title={t("home.tryOnTitle")} subtitle={t("home.tryOnBody")} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {designs.map((d) => (
          <Link key={d.id} href={`/try-on/${d.id}`} className="group overflow-hidden rounded-2xl border border-line bg-paper shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="relative aspect-[4/5] bg-sand">
              <SmartImage src={d.images[0] ?? d.tryOnUrl!} alt={d.title} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
            </div>
            <div className="p-4">
              <p className="text-xs text-gold-deep">{tx(`categories.${d.category}`)}</p>
              <p className="mt-0.5 truncate font-medium">{d.title}</p>
              <p className="mt-1 truncate text-xs text-muted">
                {d.shopName} · {formatPrice(d.price, locale)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
