import { NextResponse, type NextRequest } from "next/server";
import { attachPlaceThumbnailsForDomain } from "@/lib/places/fetch-attraction-photo-urls";
import { enrichPlaceCandidates } from "@/lib/context-resolver/places/rank-place-candidates";
import { queryNearbyPlaces } from "@/lib/context-resolver/places/query-nearby-places";
import { resolvePlacePreference } from "@/lib/context-resolver/places/place-preference";
import type { PlaceDiscoveryCriteria } from "@/lib/context-resolver/places/types";
import type { ContextPlaceInventoryRow } from "@/lib/globe/place/place-resource-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlaceInventoryDomain = "activity" | "amenity";

function parseCoord(value: string | null): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDomain(value: string | null): PlaceInventoryDomain | null {
  return value === "activity" || value === "amenity" ? value : null;
}

function buildCriteria(input: {
  domain: PlaceInventoryDomain;
  query: string;
  maxResults: number;
  radiusM: number;
}): PlaceDiscoveryCriteria {
  return {
    intent: "FIND_PLACE",
    query: input.query,
    category: input.domain,
    cuisine_keyword: input.query,
    vibe: "unknown",
    only_open_now: false,
    min_rating: 0,
    max_results: input.maxResults,
    radius_m: input.radiusM,
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const domain = parseDomain(params.get("domain"));
  const query = params.get("q")?.trim() ?? "";
  const lat = parseCoord(params.get("lat"));
  const lng = parseCoord(params.get("lng"));
  const maxRaw = parseCoord(params.get("max"));
  const radiusRaw = parseCoord(params.get("radiusM"));
  const maxResults = maxRaw != null ? Math.min(Math.max(Math.round(maxRaw), 1), 12) : 5;
  const radiusM =
    radiusRaw != null ? Math.min(Math.max(Math.round(radiusRaw), 100), 50000) : 3000;

  if (!domain || !query || lat == null || lng == null) {
    return NextResponse.json(
      { error: "domain_query_lat_lng_required" },
      { status: 400 },
    );
  }

  const criteria = buildCriteria({ domain, query, maxResults, radiusM });
  const raw = await queryNearbyPlaces({
    lat,
    lng,
    criteria,
  });
  const preference = await resolvePlacePreference({ vibe: "unknown" });
  const withThumbnails = await attachPlaceThumbnailsForDomain(raw, {
    anchor: null,
    cuisine: query,
    domain,
  });
  const ranked = enrichPlaceCandidates({
    candidates: withThumbnails,
    origin: { lat, lng },
    criteria,
    preference,
  })
    .sort((a, b) => a.travel_minutes - b.travel_minutes)
    .slice(0, maxResults);

  const inventory: ContextPlaceInventoryRow[] = ranked.map((candidate) => ({
    placeId: candidate.place_id,
    name: candidate.name,
    lat: candidate.lat,
    lng: candidate.lng,
    images: candidate.photo_urls ?? (candidate.thumbnail_url ? [candidate.thumbnail_url] : []),
    address: candidate.address ?? null,
    cuisineHint: null,
    priceLevel: null,
    rating: candidate.rating ?? null,
    openNow: candidate.open_now ?? null,
    mapsUrl: candidate.maps_url ?? null,
    provider: null,
    providerLabel: null,
    categoryLabel:
      candidate.naver_category ??
      candidate.google_types?.join(" ") ??
      criteria.category,
    specialReasonKo: candidate.reason,
    specialScore: null,
    searchScore: null,
    virtualCandidate: true as const,
  }));

  return NextResponse.json({
    ok: true,
    inventory,
    source: "google_places",
  });
}
