"use client";

import { useEffect, useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

/** Recenter without remounting the whole map */
export function MapRecenter({
  center,
  zoom,
}: {
  center: LatLngExpression;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (Array.isArray(center)) {
      map.setView(center, zoom ?? map.getZoom(), { animate: true });
    }
  }, [map, center, zoom]);
  return null;
}

export function MapClickPicker({
  onPick,
  enabled = true,
}: {
  onPick: (lat: number, lon: number) => void;
  enabled?: boolean;
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}
