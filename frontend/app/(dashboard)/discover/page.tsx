"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TopNav } from "@/components/dashboard/TopNav";
import { SearchBar } from "@/components/discover/SearchBar";
import { PlaceCard } from "@/components/discover/PlaceCard";
import { TripPlanModal } from "@/components/discover/TripPlanModal";
import { MapView } from "@/components/map/MapView";
import { llmApi, placesApi } from "@/lib/api";
import { researchStore } from "@/lib/researchStore";
import { pendingStore } from "@/lib/pendingStore";
import type { Place } from "@/lib/types";

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

interface ModalTarget {
  place: Place;
  existingPlaceKey?: string;
}

export default function DiscoverPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [pendingPlaces, setPendingPlaces] = useState<{ id: string; name: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null);
  const [researchMap, setResearchMap] = useState<Record<string, string>>({});
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [focusedCoords, setFocusedCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Restore pending placeholders from localStorage
    setPendingPlaces(pendingStore.getAll());

    placesApi.list().then((fetched) => {
      setPlaces(fetched);
      // Remove pending entries whose place was already created
      setPendingPlaces((prev) => {
        const remaining = prev.filter(
          (p) => !fetched.some((f) => f.name.toLowerCase() === p.name.toLowerCase())
        );
        remaining.forEach((p) => {
          if (!pendingStore.getAll().find((e) => e.id === p.id)) pendingStore.remove(p.id);
        });
        // Prune matched ones from localStorage
        prev.forEach((p) => {
          if (!remaining.find((r) => r.id === p.id)) pendingStore.remove(p.id);
        });
        return remaining;
      });
    }).catch(() => {});

    // Load persisted research keys
    const all = researchStore.getAll();
    const completed: Record<string, string> = {};
    const processing: string[] = [];
    for (const [placeId, entry] of Object.entries(all)) {
      if (entry.status === "completed") completed[placeId] = entry.place_key;
      else if (entry.status === "processing") processing.push(placeId);
    }
    setResearchMap(completed);
    setProcessingIds(processing);
  }, []);

  function addPending(id: string, name: string) {
    pendingStore.add(id, name);
    setPendingPlaces((prev) => [...prev, { id, name }]);
  }

  function removePending(id: string) {
    pendingStore.remove(id);
    setPendingPlaces((prev) => prev.filter((p) => p.id !== id));
  }

  function swapPendingForReal(tempId: string, place: Place) {
    pendingStore.remove(tempId);
    setPendingPlaces((prev) => prev.filter((p) => p.id !== tempId));
    setPlaces((prev) => [place, ...prev]);
  }

  function handleOpenModal(place: Place) {
    const entry = researchStore.get(place.id);
    setModalTarget({
      place,
      existingPlaceKey: entry?.status === "completed" ? entry.place_key : undefined,
    });
  }

  function handleResearchStart(placeId: string) {
    setProcessingIds((prev) => (prev.includes(placeId) ? prev : [...prev, placeId]));
  }

  function handleResearchComplete(placeId: string, placeKey: string) {
    setResearchMap((prev) => ({ ...prev, [placeId]: placeKey }));
    setProcessingIds((prev) => prev.filter((id) => id !== placeId));
  }

  function handleCardClick(place: Place) {
    if (place.coordinates) {
      setFocusedCoords({ lat: place.coordinates.lat, lng: place.coordinates.lng });
    }
  }

  async function handleSearch(prompt: string) {
    const tempId = `pending-${Date.now()}`;
    const optimisticName = toTitleCase(prompt);
    addPending(tempId, optimisticName);
    setSearchLoading(true);
    try {
      const queries = await llmApi.suggestQueries(prompt);
      const results = await placesApi.searchImages(queries);
      if (results.length === 0) {
        toast.info("No images found. Try a different search.");
        removePending(tempId);
        return;
      }
      const image = results[0];
      const placeName = toTitleCase(queries[0] ?? prompt);

      // Geocode the place name via Nominatim
      let coords: { lat: number; lng: number } | undefined;
      try {
        const geoResp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`,
          { headers: { "Accept-Language": "en" } }
        );
        const geoData = await geoResp.json();
        if (geoData[0]) {
          coords = { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) };
        }
      } catch {
        // geocoding is best-effort
      }

      const place = await placesApi.create({
        name: placeName,
        description: "",
        image_url: image.url,
        image_alt: image.alt,
        search_query: prompt,
        coordinates: coords,
      });
      swapPendingForReal(tempId, place);
      toast.success(`"${place.name}" saved!`);
    } catch {
      removePending(tempId);
      toast.error("Search failed. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleMapPlaceFound(name: string, lat: number, lng: number) {
    const tempId = `pending-${Date.now()}`;
    const placeName = toTitleCase(name);
    addPending(tempId, placeName);
    try {
      const results = await placesApi.searchImages([name]);
      const image = results[0] ?? null;
      const place = await placesApi.create({
        name: placeName,
        description: "",
        coordinates: { lat, lng },
        image_url: image?.url ?? "",
        image_alt: image?.alt ?? name,
        search_query: name,
      });
      swapPendingForReal(tempId, place);
      toast.success(`"${place.name}" saved!`);
    } catch {
      removePending(tempId);
      toast.error("Failed to save place from map.");
    }
  }

  async function handleDelete(placeId: string) {
    try {
      await placesApi.delete(placeId);
      researchStore.remove(placeId);
      setPlaces((prev) => prev.filter((p) => p.id !== placeId));
      setResearchMap((prev) => {
        const next = { ...prev };
        delete next[placeId];
        return next;
      });
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
            focusedCoords={focusedCoords ?? undefined}
            className="h-[400px] rounded-xl overflow-hidden border border-border"
          />
        </div>

        {/* Saved Places Grid */}
        {(places.length > 0 || pendingPlaces.length > 0) && (
          <div className="animate-fade-in-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingPlaces.map((pending) => (
                <PlaceCard
                  key={pending.id}
                  place={{ id: pending.id, name: pending.name, description: "", image_url: "", image_alt: "", search_query: "" } as Place}
                  isLoading
                  onPrepare={handleOpenModal}
                />
              ))}
              {places.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  researchKey={researchMap[place.id]}
                  isResearching={processingIds.includes(place.id)}
                  onPrepare={handleOpenModal}
                  onDelete={handleDelete}
                  onCardClick={handleCardClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {modalTarget && (
        <TripPlanModal
          place={modalTarget.place}
          existingPlaceKey={modalTarget.existingPlaceKey}
          onClose={() => setModalTarget(null)}
          onResearchStart={handleResearchStart}
          onResearchComplete={handleResearchComplete}
        />
      )}
    </div>
  );
}
