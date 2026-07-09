import { NextResponse, type NextRequest } from "next/server";
import { fetchPlacesLodgingNearby } from "@/lib/globe/context-hub/fetch-places-lodging-nearby";
import {
  isLiteApiConfigured,
  searchLiteApiLodgingNearby,
} from "@/lib/globe/context-hub/providers/liteapi";
import { GLOBE_DISCOVERY_FETCH_LIMIT } from "@/lib/globe/discovery/globe-discovery-feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCoord(value: string | null): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Context lodging Hub factory — LiteAPI (live rates) or Google Places fallback. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = parseCoord(params.get("lat"));
  const lng = parseCoord(params.get("lng"));
  const maxRaw = parseCoord(params.get("max"));
  const checkInIso = params.get("checkIn")?.trim() || null;
  const checkOutIso = params.get("checkOut")?.trim() || null;
  const guestCount = parseCoord(params.get("guests"));
  const maxResults =
    maxRaw != null
      ? Math.min(Math.max(Math.round(maxRaw), 1), GLOBE_DISCOVERY_FETCH_LIMIT)
      : GLOBE_DISCOVERY_FETCH_LIMIT;

  if (lat == null || lng == null) {
    return NextResponse.json({ error: "lat_lng_required" }, { status: 400 });
  }

  if (isLiteApiConfigured()) {
    const inventory = await searchLiteApiLodgingNearby({
      lat,
      lng,
      maxResults,
      checkInIso,
      checkOutIso,
      guestCount: guestCount ?? 2,
    });
    if (inventory.length > 0) {
      return NextResponse.json({
        ok: true,
        inventory,
        source: "liteapi",
      });
    }
  }

  const inventory = await fetchPlacesLodgingNearby({ lat, lng, maxResults });

  return NextResponse.json({
    ok: true,
    inventory,
    source: inventory.length > 0 ? "google_places" : "empty",
  });
}
