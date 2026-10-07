"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { LocateFixed } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { buttonClass } from "@/components/ui/button";
import { DEFAULT_CENTER } from "@/lib/constants";

const TILE = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || "&copy; OpenStreetMap contributors";

function Clicks({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}
function Fly({ to }: { to: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (to) map.flyTo(to, 16, { duration: 0.8 });
  }, [to, map]);
  return null;
}

/** Tap-to-place pin; writes `lat`/`lng` hidden inputs for the surrounding form. */
export function LocationPicker({ defaultLat, defaultLng }: { defaultLat?: number | null; defaultLng?: number | null }) {
  const { t } = useI18n();
  const [pos, setPos] = useState<[number, number] | null>(defaultLat != null && defaultLng != null ? [defaultLat, defaultLng] : null);
  const [fly, setFly] = useState<[number, number] | null>(null);
  const icon = useMemo(() => L.divIcon({ className: "", html: '<div class="dfy-pin">✂</div>', iconSize: [38, 38], iconAnchor: [19, 19] }), []);

  return (
    <div className="space-y-2">
      <div className="relative h-72 overflow-hidden rounded-2xl border border-line-strong">
        <MapContainer center={pos ?? [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]} zoom={pos ? 15 : 12} className="size-full">
          <TileLayer url={TILE} attribution={ATTR} />
          <Clicks onPick={(lat, lng) => setPos([lat, lng])} />
          <Fly to={fly} />
          {pos && <Marker position={pos} icon={icon} draggable eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); setPos([ll.lat, ll.lng]); } }} />}
        </MapContainer>
        <button
          type="button"
          className={buttonClass("light", "sm", "absolute end-3 bottom-3 z-[500] shadow-soft")}
          onClick={() =>
            navigator.geolocation?.getCurrentPosition((p) => {
              const ll: [number, number] = [p.coords.latitude, p.coords.longitude];
              setPos(ll);
              setFly(ll);
            })
          }
        >
          <LocateFixed /> {t("tailorJoin.useMyLocation")}
        </button>
      </div>
      <input type="hidden" name="lat" value={pos ? pos[0].toFixed(6) : ""} />
      <input type="hidden" name="lng" value={pos ? pos[1].toFixed(6) : ""} />
      <p className="text-xs text-muted">{pos ? `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}` : t("tailorJoin.locationHint")}</p>
    </div>
  );
}
