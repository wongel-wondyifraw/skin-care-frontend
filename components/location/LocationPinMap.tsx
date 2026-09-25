"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { shopFetchMapConfig } from "@/lib/shop-api";
import { Skeleton } from "@/components/ui/skeleton";
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

type Props = {
  lat: number;
  lon: number;
  label?: string;
  heightClass?: string;
};

export function LocationPinMap({
  lat,
  lon,
  label = "Selected location",
  heightClass = "h-[180px]",
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
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    });
  }, []);

  if (!apiKey || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return <Skeleton className={`w-full ${heightClass} rounded-xl`} />;
  }

  const tileUrl = `https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${apiKey}`;

  return (
    <div
      className={`w-full ${heightClass} rounded-xl overflow-hidden border border-border shadow-sm z-0 relative`}
    >
      <MapContainer
        key={`${lat}-${lon}`}
        center={[lat, lon]}
        zoom={14}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://locationiq.com/">LocationIQ</a>'
        />
        <Marker position={[lat, lon]}>
          <Popup>{label}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
