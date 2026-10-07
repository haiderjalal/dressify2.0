import Link from "next/link";
import { BadgeCheck, Home, MapPin, Star } from "lucide-react";
import type { Translator } from "@/i18n/core";
import { Avatar } from "@/components/ui/avatar";
import { SmartImage } from "@/components/ui/smart-image";
import { formatDistance, formatPrice, rating } from "@/lib/utils";

export type TailorCardData = {
  slug: string;
  shopName: string;
  area: string | null;
  city: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  ratingSum: number;
  ratingCount: number;
  priceFrom: number;
  isWomenLed: boolean;
  isHomeBased: boolean;
  specialties: string[];
  yearsExperience: number;
  distanceKm?: number | null;
};

export function TailorCard({ t: tr, tailor, priority }: { t: Translator; tailor: TailorCardData; priority?: boolean }) {
  const { t, tx, locale } = tr;
  const r = rating(tailor.ratingSum, tailor.ratingCount);
  return (
    <Link href={`/tailors/${tailor.slug}`} className="atelier-panel tailor-discovery-card group block overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[16/9] overflow-hidden bg-sand">
        {tailor.coverUrl && <SmartImage src={tailor.coverUrl} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" priority={priority} />}
        <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
          {tailor.isWomenLed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-paper/95 px-2.5 py-1 text-[11px] font-medium text-gold-deep backdrop-blur">
              <BadgeCheck className="size-3.5" /> {t("tailor.womenLed")}
            </span>
          )}
          {tailor.isHomeBased && (
            <span className="inline-flex items-center gap-1 rounded-full bg-paper/95 px-2.5 py-1 text-[11px] font-medium text-ink-soft backdrop-blur">
              <Home className="size-3.5" /> {t("tailor.homeBased")}
            </span>
          )}
        </div>
      </div>
      <div className="relative px-5 pt-0 pb-5">
        <Avatar name={tailor.shopName} src={tailor.avatarUrl} size={56} className="-mt-7 border-4 border-paper" />
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-2xl font-semibold text-ink">{tailor.shopName}</h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted">
              <MapPin className="size-3.5 shrink-0" />
              {[tailor.area, tailor.city].filter(Boolean).join(", ")}
              {tailor.distanceKm != null && <span className="text-faint"> · {formatDistance(tailor.distanceKm, locale)}</span>}
            </p>
          </div>
          {tailor.ratingCount > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-sm font-semibold text-gold-deep tabular-nums">
              <Star className="size-3.5 fill-current" /> {r.toFixed(1)}
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-sand px-2 py-0.5 text-xs text-muted">{t("tailor.newTailor")}</span>
          )}
        </div>
        <p className="mt-3 line-clamp-1 text-sm text-ink-soft">{tailor.specialties.slice(0, 3).map((c) => tx(`categories.${c}`)).join(" · ")}</p>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
          <span className="text-muted">{tailor.priceFrom > 0 ? t("tailor.startsFrom", { price: formatPrice(tailor.priceFrom, locale) }) : " "}</span>
          <span className="text-faint">{tailor.ratingCount > 0 ? t("tailor.reviews", { n: tailor.ratingCount }) : t("tailor.years", { n: tailor.yearsExperience })}</span>
        </div>
      </div>
    </Link>
  );
}
