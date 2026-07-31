/**
 * Lodging inventory → PlaceSearchHit for Context Workspace (Reality OS).
 * Search inventory must not paint 3D Globe pins before Reality Commit.
 */

import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import type { PlaceSearchHit } from "@/lib/search-engine/run-place-search";

export function lodgingInventoryRowsToPlaceHits(
  rows: readonly ContextLodgingInventoryRow[],
): PlaceSearchHit[] {
  return rows.map((row) => {
    const priceKrw = row.priceKrw ?? null;
    return {
      id: row.placeId,
      labelKo: row.name,
      domain: "lodging" as const,
      lat: row.lat,
      lng: row.lng,
      rating: row.rating ?? null,
      walkMinutes: null,
      reservable: true,
      localFavorite: false,
      priceBand:
        priceKrw != null && priceKrw > 0
          ? Math.min(4, Math.max(1, Math.ceil(priceKrw / 80_000)))
          : null,
      source:
        row.provider === "liteapi"
          ? ("liteapi" as const)
          : row.provider === "google_places"
            ? ("maps" as const)
            : ("seed" as const),
      liteapiHotelId: row.liteapiHotelId ?? null,
      amountLabel:
        priceKrw != null && Number.isFinite(priceKrw)
          ? `₩${Math.round(priceKrw / 10_000)}만`
          : null,
      priceKrw,
      reviewCount: row.reviewCount ?? null,
      thumbnailUrl: row.images[0] ?? null,
      images: row.images,
    };
  });
}
