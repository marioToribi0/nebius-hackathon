"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { TopNav } from "@/components/dashboard/TopNav";
import { PlaceCard } from "@/components/discover/PlaceCard";
import { placesApi } from "@/lib/api";
import type { Place } from "@/lib/types";
import { Compass, MapPin, Search } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    placesApi.list().then(setPlaces).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-full">
      <TopNav title="Dashboard" />

      <div className="flex-1 p-6 space-y-6">
        {/* Welcome */}
        <div className="animate-fade-in-up">
          <h2 className="text-2xl font-bold text-foreground font-[family-name:var(--font-playfair)]">
            Welcome back,{" "}
            <span className="text-primary">{user?.full_name || user?.email}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ready to discover your next adventure?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up">
          <Link
            href="/discover"
            className="warm-card p-5 flex items-center gap-4 hover:border-primary/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Discover Places</p>
              <p className="text-xs text-muted-foreground">Search with AI-powered image discovery</p>
            </div>
          </Link>

          <Link
            href="/discover"
            className="warm-card p-5 flex items-center gap-4 hover:border-accent/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Compass className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Explore Map</p>
              <p className="text-xs text-muted-foreground">View your saved places on the map</p>
            </div>
          </Link>

          <div className="warm-card p-5 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">{places.length} Places</p>
              <p className="text-xs text-muted-foreground">Saved destinations</p>
            </div>
          </div>
        </div>

        {/* Recent Places */}
        {places.length > 0 && (
          <div className="animate-fade-in-up">
            <h3 className="text-lg font-bold text-foreground font-[family-name:var(--font-playfair)] mb-3">
              Recent Places
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {places.slice(0, 6).map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          </div>
        )}

        {places.length === 0 && (
          <div className="animate-fade-in-up warm-card p-12 text-center">
            <Compass className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground font-[family-name:var(--font-playfair)]">
              No places yet
            </h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Start discovering beautiful destinations around the world
            </p>
            <Link
              href="/discover"
              className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Start Exploring
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
