"use client";

import dynamic from "next/dynamic";
import type { Place } from "@/lib/types";

interface MapViewProps {
  places: Place[];
  className?: string;
  onPlaceFound?: (name: string, lat: number, lng: number) => void;
  focusedCoords?: { lat: number; lng: number };
}

const MapInner = dynamic(() => import("./MapInner"), { ssr: false });

export function MapView({ places, className, onPlaceFound, focusedCoords }: MapViewProps) {
  return (
    <div className={className}>
      <MapInner places={places} onPlaceFound={onPlaceFound} focusedCoords={focusedCoords} />
    </div>
  );
}
