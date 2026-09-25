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
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false },
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false },
);
const MapClickPicker = dynamic(
  () => import("./MapInteractions").then((mod) => mod.MapClickPicker),
  { ssr: false },
);

type Props = {
  customerLat: number;
  customerLon: number;
  shopLat?: number;
  shopLon?: number;
  /** Move the delivery pin by clicking the map */
  onPick?: (lat: number, lon: number) => void;
  heightClass?: string;
};

export function DeliveryRouteMap({
  customerLat,
  customerLon,
  shopLat = 9.0192,
  shopLon = 38.7525,
  onPick,
  heightClass = "h-[200px] md:h-[320px]",
}: Props) {
  const [apiKey, setApiKey] = useState<string | null>(null);

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
    return <Skeleton className={cn("w-full rounded-xl", heightClass)} />;
  }

  const centerLat = (customerLat + shopLat) / 2;
  const centerLon = (customerLon + shopLon) / 2;
  const tileUrl = `https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${apiKey}`;

  return (
    <div
      className={cn(
        "w-full rounded-xl overflow-hidden border border-border shadow-sm z-0 relative",
        heightClass,
        onPick && "cursor-crosshair",
      )}
    >
      <MapContainer
        key={`${customerLat.toFixed(4)}-${customerLon.toFixed(4)}`}
        center={[centerLat, centerLon]}
        bounds={[
          [shopLat, shopLon],
          [customerLat, customerLon],
        ]}
        boundsOptions={{ padding: [30, 30] }}
        zoom={12}
        scrollWheelZoom
        className="w-full h-full"
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://locationiq.com/">LocationIQ</a>'
        />
        {onPick && <MapClickPicker onPick={onPick} />}

        <Marker position={[shopLat, shopLon]}>
          <Popup>Shop Origin</Popup>
        </Marker>

        <Marker position={[customerLat, customerLon]}>
          <Popup>Delivery Location</Popup>
        </Marker>

        <Polyline
          positions={[
            [shopLat, shopLon],
            [customerLat, customerLon],
          ]}
          color="#0ea5e9"
          weight={3}
          dashArray="5, 10"
        />
      </MapContainer>
      {onPick && (
        <p className="absolute bottom-2 left-2 right-2 z-[1000] pointer-events-none rounded-md bg-background/90 px-2 py-1 text-[10px] text-muted-foreground border border-border/60 text-center">
          Tap the map to move your delivery pin
        </p>
      )}
    </div>
  );
}
