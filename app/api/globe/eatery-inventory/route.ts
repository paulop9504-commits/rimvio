import { NextResponse, type NextRequest } from "next/server";
import { GLOBE_DISCOVERY_FETCH_LIMIT } from "@/lib/globe/discovery/globe-discovery-feed";
import { parseCanonicalPlaceProfile } from "@/lib/globe/canonical-place-profile";
import { searchRestaurants } from "@/lib/restaurant-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCoord(value: string | null): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Map discovery — unified restaurant search contract. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim() ?? "";
  const anchorLabel = params.get("anchor")?.trim() ?? null;
  const placeProfile = parseCanonicalPlaceProfile(params.get("placeProfile"));
  const lat = parseCoord(params.get("lat"));
  const lng = parseCoord(params.get("lng"));
  const maxRaw = parseCoord(params.get("max"));
  const radiusRaw = parseCoord(params.get("radiusM"));
  const maxResults =
    maxRaw != null
      ? Math.min(Math.max(Math.round(maxRaw), 1), GLOBE_DISCOVERY_FETCH_LIMIT)
      : GLOBE_DISCOVERY_FETCH_LIMIT;
  // Cap allows city-wide activity/landmark discovery (유니버설 등); nearby eatery
  // /lodging callers still pass their own small radius, so they're unaffected.
  const radiusM = radiusRaw != null ? Math.min(Math.max(Math.round(radiusRaw), 100), 50000) : 500;

  if (!query || lat == null || lng == null) {
    return NextResponse.json({ error: "query_lat_lng_required" }, { status: 400 });
  }

  const result = await searchRestaurants({
    query,
    anchorLabel,
    placeProfile,
    origin: { lat, lng },
    maxResults,
    radiusM,
  });
  const inventory = result.candidates.map((candidate) => ({
    placeId: candidate.placeId,
    name: candidate.name,
    lat: candidate.lat,
    lng: candidate.lng,
    images: [...candidate.images],
    address: candidate.address ?? null,
    cuisineHint: candidate.cuisineHint ?? null,
    priceLevel: candidate.priceLevel ?? null,
    rating: candidate.rating ?? null,
    openNow: candidate.openNow ?? null,
    mapsUrl: candidate.mapsUrl ?? null,
    provider: candidate.source,
    providerLabel: candidate.sourceLabel,
    categoryLabel: candidate.categoryLabel ?? null,
    specialReasonKo: candidate.specialReasonKo ?? null,
    specialScore: candidate.specialScore ?? null,
    searchScore: candidate.searchScore ?? null,
    virtualCandidate: true,
  }));
  const providers = Object.keys(result.providerBreakdown);
  const source =
    providers.length > 1
      ? "multi_provider"
      : providers[0] === "naver_local"
        ? "naver_local"
        : providers[0] === "google_places"
          ? "google_places"
          : "mock";

  return NextResponse.json({
    ok: true,
    inventory,
    source,
    followupQuestionKo: result.followupQuestionKo,
  });
}
