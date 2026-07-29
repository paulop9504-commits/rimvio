/**
 * Map Hub lodging inventory rows → Search Engine PlaceSearchHit.
 */

import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { PlaceSearchHit } from "@/lib/search-engine/run-place-search";

function walkMinutesFromKm(km: number): number {
  return Math.max(1, Math.round(km / 0.08));
}

function priceBandFromKrw(priceKrw: number | null | undefined): number | null {
  if (priceKrw == null || !Number.isFinite(priceKrw)) {
    return null;
  }
  if (priceKrw < 60_000) {
    return 1;
  }
  if (priceKrw < 120_000) {
    return 2;
  }
  if (priceKrw < 200_000) {
    return 3;
  }
  return 4;
}

export function mapLodgingInventoryToPlaceHits(input: {
  readonly rows: readonly ContextLodgingInventoryRow[];
  readonly query?: string | null;
  readonly anchorLat?: number | null;
  readonly anchorLng?: number | null;
  readonly limit?: number;
}): readonly PlaceSearchHit[] {
  const limit = input.limit ?? 4;
  const anchorLat = input.anchorLat;
  const anchorLng = input.anchorLng;
  const query = input.query?.trim() ?? "";

  const ranked = [...input.rows].sort((a, b) => {
    if (query) {
      const aHit = a.name.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      const bHit = b.name.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      if (aHit !== bHit) {
        return bHit - aHit;
      }
    }
    const aPrice = a.roomOffers?.[0]?.totalPriceKrw ?? Number.POSITIVE_INFINITY;
    const bPrice = b.roomOffers?.[0]?.totalPriceKrw ?? Number.POSITIVE_INFINITY;
    return aPrice - bPrice;
  });

  return ranked.slice(0, limit).map((row, index) => {
    const km =
      anchorLat != null && anchorLng != null
        ? haversineKm(anchorLat, anchorLng, row.lat, row.lng)
        : 0.4 + index * 0.12;
    const offer = row.roomOffers?.[0];
    const isLiteApi =
      row.provider === "liteapi" || row.placeId.startsWith("liteapi:");
    const source: PlaceSearchHit["source"] = isLiteApi ? "liteapi" : "maps";
    let id = row.placeId;
    if (isLiteApi) {
      id = row.placeId.startsWith("liteapi:")
        ? row.placeId
        : `liteapi:${row.liteapiHotelId ?? row.placeId}`;
    } else if (!row.placeId.startsWith("maps:")) {
      id = `maps:${row.placeId}`;
    }

    return {
      id,
      labelKo: row.name,
      domain: "lodging" as const,
      lat: row.lat,
      lng: row.lng,
      rating: row.rating ?? null,
      walkMinutes: walkMinutesFromKm(km),
      reservable: Boolean(offer?.providerOfferId) || isLiteApi,
      localFavorite: false,
      priceBand: priceBandFromKrw(offer?.totalPriceKrw ?? row.priceKrw),
      source,
      liteapiOfferId: offer?.providerOfferId?.trim() ?? null,
      liteapiHotelId: row.liteapiHotelId?.trim() ?? null,
      amountLabel:
        offer?.totalPriceKrw != null && Number.isFinite(offer.totalPriceKrw)
          ? `${offer.totalPriceKrw.toLocaleString("ko-KR")}원`
          : null,
      reviewCount:
        typeof row.reviewCount === "number" && Number.isFinite(row.reviewCount)
          ? Math.round(row.reviewCount)
          : null,
      priceKrw:
        offer?.totalPriceKrw ??
        (typeof row.priceKrw === "number" && Number.isFinite(row.priceKrw)
          ? row.priceKrw
          : null),
      thumbnailUrl: row.images?.[0]?.trim() || null,
      reasonKo: null,
    };
  });
}
