"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Place } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";

// Fix default marker icon issue with bundlers
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface MapSearchProps {
  onPlaceFound?: (name: string, lat: number, lng: number) => void;
}

function MapSearch({ onPlaceFound }: MapSearchProps) {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent map events from firing through the search box
  useEffect(() => {
    if (!containerRef.current) return;
    L.DomEvent.disableClickPropagation(containerRef.current);
    L.DomEvent.disableScrollPropagation(containerRef.current);
  }, []);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setOpen(false);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: NominatimResult[] = await resp.json();
      setResults(data);
      setOpen(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(result: NominatimResult) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    map.flyTo([lat, lng], 14, { animate: true, duration: 1.2 });
    setOpen(false);
    setQuery(result.display_name.split(",")[0]);
    onPlaceFound?.(result.display_name.split(",")[0], lat, lng);
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", top: 10, right: 10, zIndex: 1000, width: 280 }}
    >
      <div className="flex gap-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search on map…"
          className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#B45309] shadow"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-3 py-2 bg-[#B45309] hover:bg-[#92400E] text-white rounded-lg shadow transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>
      {open && results.length > 0 && (
        <div className="mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors border-b border-border last:border-0 text-foreground"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && (
        <div className="mt-1 bg-background border border-border rounded-lg shadow-lg px-3 py-2 text-sm text-muted-foreground">
          No results found
        </div>
      )}
    </div>
  );
}

interface MapInnerProps {
  places: Place[];
  onPlaceFound?: (name: string, lat: number, lng: number) => void;
}

export default function MapInner({ places, onPlaceFound }: MapInnerProps) {
  useEffect(() => {
    L.Marker.prototype.options.icon = defaultIcon;
  }, []);

  const placesWithCoords = places.filter((p) => p.coordinates);

  const center: [number, number] =
    placesWithCoords.length > 0
      ? [placesWithCoords[0].coordinates!.lat, placesWithCoords[0].coordinates!.lng]
      : [20, 0];

  return (
    <MapContainer
      center={center}
      zoom={placesWithCoords.length > 0 ? 5 : 2}
      className="h-full w-full rounded-xl"
      style={{ minHeight: "400px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapSearch onPlaceFound={onPlaceFound} />
      {placesWithCoords.map((place) => (
        <Marker
          key={place.id}
          position={[place.coordinates!.lat, place.coordinates!.lng]}
        >
          <Popup>
            <div className="text-center">
              {place.image_url && (
                <img
                  src={place.image_url}
                  alt={place.image_alt || place.name}
                  className="w-40 h-24 object-cover rounded mb-2"
                />
              )}
              <p className="font-bold text-sm">{place.name}</p>
              {place.description && (
                <p className="text-xs text-gray-600 mt-1">{place.description}</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
