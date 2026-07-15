/**
 * Browser runtime for named Research tools — reuses live external SSOT fetches.
 *
 * places_details → Places inventory (keyword / domain)
 * rate_lookup    → LiteAPI lodging rates (no keyword)
 * yt_preview     → lodging-preview-video
 */

import {
  fetchLiveEateryInventory,
  fetchLiveLodgingPlaces,
  fetchLiveLodgingRates,
  fetchLivePlaceInventory,
  fetchLiveYtPreview,
} from "@/lib/research-engine/live-external-ssot";
import {
  matchInventoryHit,
  resolveResearchToolSurface,
} from "@/lib/research-engine/tools/match-inventory-hit";
import {
  createResearchFetchCache,
  type ResearchFetchCache,
} from "@/lib/research-engine/tools/research-fetch-cache";
import type { ResearchToolRuntime } from "@/lib/research-engine/tools/types";

/**
 * Live Globe API injectors for surgical tools.
 * Soft-fails (null) when offline / unconfigured — tools then skip cleanly.
 * Optional request-scoped cache dedupes identical Places/LiteAPI/YT calls.
 */
export function createBrowserResearchToolRuntime(
  fetchImpl?: typeof fetch,
  options?: { cache?: ResearchFetchCache | boolean },
): ResearchToolRuntime {
  const cache =
    options?.cache === false
      ? null
      : options?.cache && typeof options.cache !== "boolean"
        ? options.cache
        : createResearchFetchCache();

  const memo = <T,>(key: string, factory: () => Promise<T>): Promise<T> => {
    if (!cache) return factory();
    return cache.getOrCreate(key, factory);
  };

  return {
    async fetchPlacesDetails(input) {
      const lat = input.lat ?? input.anchorLat;
      const lng = input.lng ?? input.anchorLng;
      if (lat == null || lng == null) return null;

      const surface = resolveResearchToolSurface(input.domain);
      const cacheKey = [
        "places",
        surface,
        input.placeId ?? "",
        input.title.slice(0, 40),
        lat.toFixed(4),
        lng.toFixed(4),
      ].join("|");

      return memo(cacheKey, async () => {
        let rows;
        if (surface === "eatery") {
          rows = await fetchLiveEateryInventory({
            lat,
            lng,
            query: input.title.slice(0, 40) || "맛집",
            max: 8,
            fetchImpl,
          });
        } else if (surface === "activity" || surface === "amenity") {
          rows = await fetchLivePlaceInventory({
            lat,
            lng,
            domain: surface,
            query: input.title.slice(0, 40) || "관광",
            max: 8,
            fetchImpl,
          });
        } else {
          rows = await fetchLiveLodgingPlaces({
            lat,
            lng,
            keyword: input.title.slice(0, 40) || "hotel",
            max: 8,
            fetchImpl,
          });
        }
        const hit = matchInventoryHit(rows, {
          title: input.title,
          placeId: input.placeId,
          lat: input.lat ?? lat,
          lng: input.lng ?? lng,
        });
        if (!hit) return null;
        return {
          rating: hit.rating ?? null,
          reviewCount: hit.reviewCount ?? null,
          lat: hit.lat ?? null,
          lng: hit.lng ?? null,
          priceKrw: hit.priceKrw ?? null,
          address: hit.address ?? null,
        };
      });
    },
    async fetchRate(input) {
      if (input.lat == null || input.lng == null) return null;
      const cacheKey = [
        "rate",
        input.placeId ?? "",
        input.title.slice(0, 40),
        input.lat.toFixed(4),
        input.lng.toFixed(4),
      ].join("|");

      return memo(cacheKey, async () => {
        const rows = await fetchLiveLodgingRates({
          lat: input.lat!,
          lng: input.lng!,
          max: 8,
          fetchImpl,
        });
        const hit =
          matchInventoryHit(rows, {
            title: input.title,
            placeId: input.placeId,
            lat: input.lat,
            lng: input.lng,
          }) ?? rows.find((r) => r.priceKrw != null && (r.priceKrw ?? 0) > 0);
        if (hit?.priceKrw == null || hit.priceKrw <= 0) return null;
        return { priceKrw: hit.priceKrw };
      });
    },
    async fetchYtPreview(input) {
      const cacheKey = [
        "yt",
        input.title.slice(0, 48),
        input.lat != null ? input.lat.toFixed(4) : "",
        input.lng != null ? input.lng.toFixed(4) : "",
      ].join("|");

      return memo(cacheKey, async () => {
        const preview = await fetchLiveYtPreview({
          title: input.title,
          lat: input.lat,
          lng: input.lng,
          fetchImpl,
        });
        if (!preview) return null;
        return {
          confidence: preview.confidence,
          videoTitle: preview.videoTitle,
        };
      });
    },
  };
}
