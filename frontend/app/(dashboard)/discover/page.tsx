"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TopNav } from "@/components/dashboard/TopNav";
import { SearchBar } from "@/components/discover/SearchBar";
import { PlaceCard } from "@/components/discover/PlaceCard";
import { TripPlanModal } from "@/components/discover/TripPlanModal";
import { MapView } from "@/components/map/MapView";
import { llmApi, placesApi } from "@/lib/api";
import type { Place } from "@/lib/types";

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export default function DiscoverPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  useEffect(() => {
    placesApi.list().then(setPlaces).catch(() => {});
  }, []);

  async function handleSearch(prompt: string) {
    setSearchLoading(true);
    try {
      const queries = await llmApi.suggestQueries(prompt);
      const results = await placesApi.searchImages(queries);
      if (results.length === 0) {
        toast.info("No images found. Try a different search.");
        return;
      }
      const image = results[0];
      const placeName = toTitleCase(queries[0] ?? prompt);
      const place = await placesApi.create({
        name: placeName,
        description: image.query,
        image_url: image.url,
        image_alt: image.alt,
        search_query: prompt,
      });
      setPlaces((prev) => [place, ...prev]);
      toast.success(`"${place.name}" saved!`);
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleMapPlaceFound(name: string, lat: number, lng: number) {
    try {
      // Fetch an image for the map-selected place
      const results = await placesApi.searchImages([name]);
      const image = results[0] ?? null;

      const place = await placesApi.create({
        name: toTitleCase(name),
        description: "",
        coordinates: { lat, lng },
        image_url: image?.url ?? "",
        image_alt: image?.alt ?? name,
        search_query: name,
      });
      setPlaces((prev) => [place, ...prev]);
      toast.success(`"${place.name}" saved!`);
    } catch {
      toast.error("Failed to save place from map.");
    }
  }

  async function handleDelete(placeId: string) {
    try {
      await placesApi.delete(placeId);
      setPlaces((prev) => prev.filter((p) => p.id !== placeId));
      toast.success("Place removed.");
    } catch {
      toast.error("Failed to delete place.");
    }
  }

  return (
    <div className="flex flex-col h-full">
      <TopNav title="Discover" />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Search */}
        <div className="animate-fade-in-up">
          <h2 className="text-xl font-bold text-foreground font-[family-name:var(--font-playfair)] mb-1">
            Discover new places
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Describe your dream destination and we&apos;ll find it for you
          </p>
          <SearchBar onSearch={handleSearch} loading={searchLoading} />
        </div>

        {/* Map */}
        <div className="animate-fade-in-up">
          <h3 className="text-lg font-bold text-foreground font-[family-name:var(--font-playfair)] mb-3">
            {places.length > 0 ? "Your saved places" : "Search on the map"}
          </h3>
          <MapView
            places={places}
            onPlaceFound={handleMapPlaceFound}
            className="h-[400px] rounded-xl overflow-hidden border border-border"
          />
        </div>

        {/* Saved Places Grid */}
        {places.length > 0 && (
          <div className="animate-fade-in-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {places.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  onPrepare={(p) => setSelectedPlace(p)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedPlace && (
        <TripPlanModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
}
