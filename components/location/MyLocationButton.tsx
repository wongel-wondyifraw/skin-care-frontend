"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shopReverseGeocode } from "@/lib/shop-api";
import { cn } from "@/lib/utils";

type Props = {
  onLocated: (result: {
    lat: number;
    lon: number;
    displayName?: string;
  }) => void;
  onError?: (message: string) => void;
  className?: string;
  size?: "sm" | "default";
};

export function MyLocationButton({
  onLocated,
  onError,
  className,
  size = "sm",
}: Props) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!navigator.geolocation) {
      onError?.("Geolocation is not supported on this device.");
      return;
    }
    setBusy(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60_000,
        });
      });
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      let displayName: string | undefined;
      try {
        const rev = await shopReverseGeocode(lat, lon);
        displayName = rev?.displayName;
      } catch {
        // pin still usable
      }
      onLocated({ lat, lon, displayName });
    } catch {
      onError?.(
        "Could not read device location. Allow location access or pick on the map.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={cn("gap-1.5", className)}
      disabled={busy}
      onClick={() => void handleClick()}
    >
      <LocateFixed className={cn("size-3.5", busy && "animate-pulse")} />
      {busy ? "Locating…" : "My location"}
    </Button>
  );
}
