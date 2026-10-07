import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getDesignForTryOn, getTryOnDesigns } from "@/server/modules/tailors/queries";
import { TryOnStudio } from "@/components/tryon/try-on-studio";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Try on" };

export default async function TryOnPage({ params }: { params: Promise<{ designId: string }> }) {
  const { designId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(designId)) notFound();
  const [{ t }, design, others] = await Promise.all([getI18n(), getDesignForTryOn(designId), getTryOnDesigns(12)]);
  if (!design) notFound();

  return (
    <div className="container-x py-10">
      <PageHeader eyebrow={design.shopName} title={t("tryon.title")} subtitle={t("tryon.subtitle")} />
      {design.tryOnUrl ? (
        <TryOnStudio overlayUrl={design.tryOnUrl} title={design.title} bookHref={`/tailors/${design.slug}/book?design=${design.id}`} />
      ) : (
        <EmptyState title={t("tryon.noTryOn")} />
      )}
      <h2 className="mt-12 mb-4 font-semibold">{t("tryon.chooseDesign")}</h2>
      <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {others.map((d) => (
          <Link key={d.id} href={`/try-on/${d.id}`} className={cn("w-28 shrink-0 overflow-hidden rounded-xl border bg-paper", d.id === design.id ? "border-gold ring-2 ring-gold/30" : "border-line")}>
            <div className="relative aspect-[3/5] bg-sand">
              <SmartImage src={d.tryOnUrl!} alt={d.title} fill sizes="112px" className="object-contain p-2" />
            </div>
            <p className="truncate px-2 py-1.5 text-xs">{d.title}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
