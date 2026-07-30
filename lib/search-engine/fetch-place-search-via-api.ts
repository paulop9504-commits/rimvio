/**
 * Browser → `/api/search/places` (server holds Maps/LiteAPI keys).
 */

import type {
  PlaceSearchHit,
  PlaceSearchInput,
} from "@/lib/search-engine/run-place-search";

export async function fetchPlaceSearchViaApi(
  input: PlaceSearchInput,
): Promise<readonly PlaceSearchHit[]> {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const response = await fetch("/api/search/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: input.query,
        domain: input.domain,
        lat: input.anchorLat ?? null,
        lng: input.anchorLng ?? null,
        limit: input.limit ?? 4,
        checkInIso: input.checkInIso ?? null,
        checkOutIso: input.checkOutIso ?? null,
        guestCount: input.guestCount ?? null,
        contextLabelKo: input.contextLabelKo ?? null,
        contextEventId: input.contextEventId ?? null,
      }),
    });
    if (!response.ok) {
      return [];
    }
    const body = (await response.json()) as {
      hits?: PlaceSearchHit[];
    };
    return Array.isArray(body.hits) ? body.hits : [];
  } catch {
    return [];
  }
}

/** True when live provider keys are not readable in this runtime (browser). */
export function shouldUsePlaceSearchApiBridge(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  // Server secrets are never in the client bundle.
  return true;
}
