"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { shopFetchMapConfig } from "@/lib/shop-api";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false },
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false },
);
const MapRecenter = dynamic(
  () => import("./MapInteractions").then((mod) => mod.MapRecenter),
  { ssr: false },
);
const MapClickPicker = dynamic(
  () => import("./MapInteractions").then((mod) => mod.MapClickPicker),
  { ssr: false },
);

/** Default: Addis Ababa */
export const DEFAULT_MAP_CENTER = { lat: 9.0192, lon: 38.7525 };

type Props = {
  lat?: number | null;
  lon?: number | null;
  label?: string;
  /** Tailwind height classes — default is compact mobile, tall desktop */
  heightClass?: string;
  /** When set, tapping/clicking the map places the pin */
  onPick?: (lat: number, lon: number) => void;
  className?: string;
  zoom?: number;
};

export function LocationPinMap({
  lat,
  lon,
  label = "Selected location",
  heightClass = "h-[180px] md:h-[360px]",
  onPick,
  className,
  zoom = 14,
}: Props) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const hasPin =
    lat != null &&
    lon != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lon);
  const centerLat = hasPin ? (lat as number) : DEFAULT_MAP_CENTER.lat;
  const centerLon = hasPin ? (lon as number) : DEFAULT_MAP_CENTER.lon;

  useEffect(() => {
    shopFetchMapConfig()
      .then((res) => {
        if (res?.key) setApiKey(res.key);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
        ._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    });
  }, []);

  if (!apiKey) {
    return (
      <Skeleton className={cn("w-full rounded-xl", heightClass, className)} />
    );
  }

  const tileUrl = `https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${apiKey}`;

  return (
    <div
      className={cn(
        "w-full rounded-xl overflow-hidden border border-border shadow-sm z-0 relative",
        heightClass,
        onPick && "cursor-crosshair",
        className,
      )}
    >
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={hasPin ? zoom : 12}
        scrollWheelZoom
        className="w-full h-full"
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://locationiq.com/">LocationIQ</a>'
        />
        <MapRecenter
          center={[centerLat, centerLon]}
          zoom={hasPin ? zoom : 12}
        />
        {onPick && <MapClickPicker onPick={onPick} />}
        {hasPin && (
          <Marker position={[lat as number, lon as number]}>
            <Popup>{label}</Popup>
          </Marker>
        )}
      </MapContainer>
      {onPick && (
        <p className="absolute bottom-2 left-2 right-2 z-[1000] pointer-events-none rounded-md bg-background/90 px-2 py-1 text-[10px] text-muted-foreground border border-border/60 text-center">
          Tap or click the map to set the pin
        </p>
      )}
    </div>
  );
}
