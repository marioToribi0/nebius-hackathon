import { MapPin, Trash2, QrCode, Loader2 } from "lucide-react";
import type { Place } from "@/lib/types";

interface PlaceCardProps {
  place: Place;
  researchKey?: string;
  isLoading?: boolean;
  isResearching?: boolean;
  onPrepare?: (place: Place) => void;
  onDelete?: (placeId: string) => void;
  onCardClick?: (place: Place) => void;
}

export function PlaceCard({ place, researchKey, isLoading, isResearching, onPrepare, onDelete, onCardClick }: PlaceCardProps) {
  const hasResearch = !!researchKey;

  return (
    <div
      className={`warm-card overflow-hidden flex flex-col relative${onCardClick && !isLoading ? " cursor-pointer" : ""}`}
      onClick={() => !isLoading && onCardClick?.(place)}
    >
      {/* Delete button — hidden while loading */}
      {onDelete && !isLoading && (
        <button
          onClick={() => onDelete(place.id)}
          className="absolute top-2 right-2 z-10 p-1.5 bg-black/40 hover:bg-red-600 text-white rounded-lg transition-colors"
          aria-label="Delete place"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      {isLoading ? (
        <div className="w-full h-40 bg-secondary animate-pulse" />
      ) : place.image_url ? (
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
            disabled={isLoading || isResearching}
            onClick={() => !isLoading && !isResearching && onPrepare(place)}
            className={`mt-5 w-full h-8 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              isLoading || isResearching
                ? "bg-muted text-muted-foreground cursor-wait"
                : hasResearch
                ? "bg-green-700 hover:bg-green-800 text-white cursor-pointer"
                : "bg-[#B45309] hover:bg-[#92400E] text-white cursor-pointer"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Creating place…
              </>
            ) : isResearching ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Researching trip…
              </>
            ) : hasResearch ? (
              <>
                <QrCode className="h-3.5 w-3.5" />
                Show Your QR Code
              </>
            ) : (
              "Prepare Your Trip"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
