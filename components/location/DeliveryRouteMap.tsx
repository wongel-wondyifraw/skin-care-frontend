"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { shopFetchMapConfig } from "@/lib/shop-api";
import { Skeleton } from "@/components/ui/skeleton";
import "leaflet/dist/leaflet.css";

// Dynamic imports are REQUIRED for react-leaflet because it depends on window
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

type Props = {
  customerLat: number;
  customerLon: number;
  shopLat?: number;
  shopLon?: number;
};

export function DeliveryRouteMap({ customerLat, customerLon, shopLat = 9.0192, shopLon = 38.7525 }: Props) {
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    shopFetchMapConfig()
      .then((res) => {
        if (res?.key) setApiKey(res.key);
      })
      .catch(() => {});
  }, []);

  // For fixing missing leaflet icon markers dynamically
  useEffect(() => {
    import("leaflet").then((L) => {
      // Setup default icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    });
  }, []);

  if (!apiKey) {
    return <Skeleton className="w-full h-[200px] rounded-xl" />;
  }

  const centerLat = (customerLat + shopLat) / 2;
  const centerLon = (customerLon + shopLon) / 2;
  const tileUrl = `https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${apiKey}`;

  return (
    <div className="w-full h-[200px] rounded-xl overflow-hidden border border-border shadow-sm z-0 relative">
      <MapContainer
        center={[centerLat, centerLon]}
        bounds={[
          [shopLat, shopLon],
          [customerLat, customerLon],
        ]}
        boundsOptions={{ padding: [30, 30] }}
        zoom={12}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://locationiq.com/">LocationIQ</a>'
        />
        
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
    </div>
  );
}
