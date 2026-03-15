import { MapPin, Trash2 } from "lucide-react";
import type { Place } from "@/lib/types";

interface PlaceCardProps {
  place: Place;
  onPrepare?: (place: Place) => void;
  onDelete?: (placeId: string) => void;
}

export function PlaceCard({ place, onPrepare, onDelete }: PlaceCardProps) {
  return (
    <div className="warm-card overflow-hidden flex flex-col relative">
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={() => onDelete(place.id)}
          className="absolute top-2 right-2 z-10 p-1.5 bg-black/40 hover:bg-red-600 text-white rounded-lg transition-colors"
          aria-label="Delete place"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      {place.image_url ? (
        <img
          src={place.image_url}
          alt={place.image_alt || place.name}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-secondary flex items-center justify-center">
          <MapPin className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-foreground font-[family-name:var(--font-playfair)]">
          {place.name}
        </h3>
        {place.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {place.description}
          </p>
        )}
        {place.coordinates && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {place.coordinates.lat.toFixed(2)}, {place.coordinates.lng.toFixed(2)}
          </p>
        )}
        {onPrepare && (
          <button
            onClick={() => onPrepare(place)}
            className="mt-5 w-full bg-[#B45309] hover:bg-[#92400E] text-white h-8 rounded-md text-xs font-semibold transition-colors cursor-pointer"
          >
            Prepare Your Trip
          </button>
        )}
      </div>
    </div>
  );
}
