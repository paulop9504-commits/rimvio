import { NextResponse, type NextRequest } from "next/server";
import { fetchPlacesLodgingNearby } from "@/lib/globe/context-hub/fetch-places-lodging-nearby";
import {
  lodgingInventoryHasLivePhotos,
  mergeLodgingInventoryRows,
} from "@/lib/globe/context-hub/merge-lodging-inventory-rows";
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

/** Context lodging Hub factory — LiteAPI (live rates/photos) + Places keyword fallback. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = parseCoord(params.get("lat"));
  const lng = parseCoord(params.get("lng"));
  const maxRaw = parseCoord(params.get("max"));
  const checkInIso = params.get("checkIn")?.trim() || null;
  const checkOutIso = params.get("checkOut")?.trim() || null;
  const guestCount = parseCoord(params.get("guests"));
  const keyword = params.get("keyword")?.trim() || null;
  const maxResults =
    maxRaw != null
      ? Math.min(Math.max(Math.round(maxRaw), 1), GLOBE_DISCOVERY_FETCH_LIMIT)
      : GLOBE_DISCOVERY_FETCH_LIMIT;

  if (lat == null || lng == null) {
    return NextResponse.json({ error: "lat_lng_required" }, { status: 400 });
  }

  const liteApiRows = isLiteApiConfigured()
    ? await searchLiteApiLodgingNearby({
        lat,
        lng,
        maxResults,
        checkInIso,
        checkOutIso,
        guestCount: guestCount ?? 2,
      })
    : [];

  const needsPlaces =
    Boolean(keyword) || liteApiRows.length === 0 || !lodgingInventoryHasLivePhotos(liteApiRows);
  const placesRows = needsPlaces
    ? await fetchPlacesLodgingNearby({
        lat,
        lng,
        maxResults,
        keyword,
      })
    : [];

  if (liteApiRows.length > 0 && placesRows.length > 0) {
    const inventory = mergeLodgingInventoryRows({
      primary: liteApiRows,
      secondary: placesRows,
      maxResults,
    });
    return NextResponse.json({
      ok: true,
      inventory,
      source: lodgingInventoryHasLivePhotos(inventory) ? "liteapi" : "google_places",
    });
  }

  if (liteApiRows.length > 0) {
    return NextResponse.json({
      ok: true,
      inventory: liteApiRows,
      source: "liteapi",
    });
  }

  return NextResponse.json({
    ok: true,
    inventory: placesRows,
    source: placesRows.length > 0 ? "google_places" : "empty",
  });
}
