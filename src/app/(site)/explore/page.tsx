import type { Metadata } from "next";
import Link from "next/link";
import { List, Map as MapIcon, SearchX } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { searchTailors, type TailorSort } from "@/server/modules/tailors/queries";
import { TailorCard } from "@/components/site/tailor-card";
import { EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ExploreFilters } from "@/components/site/explore-filters";
import { NearMeButton } from "@/components/site/near-me-button";
import { TailorMapLazy } from "@/components/maps/tailor-map-lazy";
import { AUDIENCES, GARMENT_CATEGORIES, NEARBY_RADIUS_KM, DEFAULT_CENTER } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Explore tailors near you" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const PAGE = 24;

export default async function ExplorePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const i18n = await getI18n();
  const { t } = i18n;

  const q = one(sp.q)?.slice(0, 60) ?? "";
  const category = (GARMENT_CATEGORIES as readonly string[]).includes(one(sp.category) ?? "") ? one(sp.category) : undefined;
  const audience = (AUDIENCES as readonly string[]).includes(one(sp.audience) ?? "") ? one(sp.audience) : undefined;
  const women = one(sp.women) === "1";
  const lat = Number(one(sp.lat));
  const lng = Number(one(sp.lng));
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && one(sp.lat) !== undefined;
  const near = hasGeo && one(sp.near) === "1";
  const sortParam = one(sp.sort);
  const sort: TailorSort = sortParam === "rating" || sortParam === "price" || (sortParam === "distance" && hasGeo) ? sortParam : hasGeo ? "distance" : "recommended";
  const view = one(sp.view) === "map" ? "map" : "list";
  const page = Math.max(1, Math.min(50, Number(one(sp.page)) || 1));

  const { items, hasMore } = await searchTailors({
    q,
    category,
    audience,
    women,
    lat: hasGeo ? lat : undefined,
    lng: hasGeo ? lng : undefined,
    radiusKm: near ? NEARBY_RADIUS_KM : undefined,
    sort,
    limit: view === "map" ? 100 : PAGE,
    offset: view === "map" ? 0 : (page - 1) * PAGE,
  });

  const base = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "page" && k !== "view") base.set(k, v);
  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(base);
    for (const [k, v] of Object.entries(patch)) (v === null ? p.delete(k) : p.set(k, v));
    const s = p.toString();
    return `/explore${s ? `?${s}` : ""}`;
  };

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{women ? t("nav.herCraft") : t("explore.subtitle")}</p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">{t("explore.title")}</h1>
          {near && <p className="mt-2 text-sm text-emerald">{t("explore.withinRadius", { km: NEARBY_RADIUS_KM })}</p>}
        </div>
        <div className="flex items-center gap-2">
          <NearMeButton active={near} />
          <div className="flex rounded-full border border-line bg-paper p-1">
            <Link href={href({ view: null })} className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm", view === "list" ? "bg-ink text-paper" : "text-ink-soft")}>
              <List className="size-4" /> {t("explore.list")}
            </Link>
            <Link href={href({ view: "map" })} className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm", view === "map" ? "bg-ink text-paper" : "text-ink-soft")}>
              <MapIcon className="size-4" /> {t("explore.map")}
            </Link>
          </div>
        </div>
      </div>

      <ExploreFilters q={q} category={category} audience={audience} women={women} sort={sort} hasGeo={hasGeo} hidden={{ lat: hasGeo ? String(lat) : "", lng: hasGeo ? String(lng) : "", near: near ? "1" : "", view: view === "map" ? "map" : "" }} />

      <p className="mt-6 mb-4 text-sm text-muted">{t("explore.results", { n: items.length + (hasMore ? "+" : "") })}</p>

      {items.length === 0 ? (
        <EmptyState icon={<SearchX />} title={t("explore.noResults")} action={<LinkButton href="/explore" variant="outline" size="sm">{t("explore.clearFilters")}</LinkButton>} />
      ) : view === "map" ? (
        <TailorMapLazy
          tailors={items.map((x) => ({ slug: x.slug, shopName: x.shopName, lat: x.lat, lng: x.lng, area: x.area, rating: x.ratingCount ? x.ratingSum / x.ratingCount : 0, women: x.isWomenLed, priceFrom: x.priceFrom, distanceKm: x.distanceKm }))}
          center={hasGeo ? { lat, lng } : DEFAULT_CENTER}
          me={hasGeo ? { lat, lng } : null}
          radiusKm={near ? NEARBY_RADIUS_KM : null}
        />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((tl, i) => (
              <TailorCard key={tl.slug} t={i18n} tailor={tl} priority={i < 3} />
            ))}
          </div>
          {(page > 1 || hasMore) && (
            <div className="mt-10 flex justify-center gap-3">
              {page > 1 && <LinkButton href={href({ page: String(page - 1) })} variant="outline">{t("common.previous")}</LinkButton>}
              {hasMore && <LinkButton href={href({ page: String(page + 1) })} variant="outline">{t("common.more")}</LinkButton>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
