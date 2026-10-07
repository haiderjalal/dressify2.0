"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useMemo } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { useI18n } from "@/i18n/client";
import { formatDistance, formatPrice, initials } from "@/lib/utils";

export type MapTailor = { slug: string; shopName: string; lat: number; lng: number; area: string | null; rating: number; women: boolean; priceFrom: number; distanceKm?: number | null };

const TILE = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || "&copy; OpenStreetMap contributors";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function TailorMap({ tailors, center, me, radiusKm }: { tailors: MapTailor[]; center: { lat: number; lng: number }; me: { lat: number; lng: number } | null; radiusKm: number | null }) {
  const { t, locale } = useI18n();
  const icons = useMemo(
    () =>
      new Map(
        tailors.map((tl) => [
          tl.slug,
          L.divIcon({ className: "", html: `<div class="dfy-pin${tl.women ? " women" : ""}">${esc(initials(tl.shopName))}</div>`, iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -18] }),
        ]),
      ),
    [tailors],
  );
  const meIcon = useMemo(() => L.divIcon({ className: "", html: '<div class="dfy-me"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), []);

  return (
    <div className="h-[70vh] min-h-96 overflow-hidden rounded-3xl border border-line shadow-soft">
      <MapContainer center={[center.lat, center.lng]} zoom={radiusKm ? 13 : 12} scrollWheelZoom className="size-full" attributionControl>
        <TileLayer url={TILE} attribution={ATTR} maxZoom={19} />
        {me && <Marker position={[me.lat, me.lng]} icon={meIcon} />}
        {me && radiusKm && <Circle center={[me.lat, me.lng]} radius={radiusKm * 1000} pathOptions={{ color: "#a5803f", weight: 1.5, fillColor: "#a5803f", fillOpacity: 0.06, dashArray: "6 6" }} />}
        {tailors.map((tl) => (
          <Marker key={tl.slug} position={[tl.lat, tl.lng]} icon={icons.get(tl.slug)}>
            <Popup>
              <div className="min-w-44 font-sans">
                <p className="text-base font-semibold text-ink">{tl.shopName}</p>
                <p className="text-xs text-muted">
                  {tl.area}
                  {tl.distanceKm != null ? ` · ${formatDistance(tl.distanceKm, locale)}` : ""}
                </p>
                <p className="mt-1 text-xs">
                  {tl.rating > 0 ? `★ ${tl.rating.toFixed(1)}` : t("tailor.newTailor")}
                  {tl.priceFrom > 0 ? ` · ${t("tailor.startsFrom", { price: formatPrice(tl.priceFrom, locale) })}` : ""}
                </p>
                <Link href={`/tailors/${tl.slug}`} className="mt-2 inline-block text-sm font-medium !text-gold-deep">
                  {t("explore.viewProfile")} →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
