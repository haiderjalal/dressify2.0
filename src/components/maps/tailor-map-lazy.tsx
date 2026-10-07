"use client";

import dynamic from "next/dynamic";

/** Leaflet touches `window`, so maps load only in the browser (and only when shown). */
export const TailorMapLazy = dynamic(() => import("./tailor-map").then((m) => m.TailorMap), {
  ssr: false,
  loading: () => <div className="h-[70vh] min-h-96 animate-pulse rounded-3xl border border-line bg-sand" />,
});

export const LocationPickerLazy = dynamic(() => import("./location-picker").then((m) => m.LocationPicker), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-2xl border border-line bg-sand" />,
});
