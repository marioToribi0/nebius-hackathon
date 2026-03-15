"use client";

import { useEffect, useState } from "react";
import { guideApi } from "@/lib/api";
import type { ResearchedPlace } from "@/lib/types";
import { MapPin, ChevronDown, Loader2 } from "lucide-react";

interface PlaceSelectorProps {
  onSelect: (place: ResearchedPlace | null) => void;
  selected: ResearchedPlace | null;
}

export function PlaceSelector({ onSelect, selected }: PlaceSelectorProps) {
  const [places, setPlaces] = useState<ResearchedPlace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    guideApi
      .listPlaces()
      .then(setPlaces)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="warm-card p-4 flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
        <MapPin className="h-5 w-5 text-accent" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Chatting about</p>
        <div className="relative">
          <select
            value={selected?.place_key ?? ""}
            onChange={(e) => {
              const place = places.find((p) => p.place_key === e.target.value) ?? null;
              onSelect(place);
            }}
            disabled={loading}
            className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition cursor-pointer disabled:opacity-50"
          >
            <option value="">
              {loading ? "Loading places..." : "Select a researched place"}
            </option>
            {places.map((p) => (
              <option key={p.place_key} value={p.place_key}>
                {p.place_name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
