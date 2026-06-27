import { NextResponse, type NextRequest } from "next/server";
import { fetchPlacesEateryNearby } from "@/lib/globe/eatery/fetch-places-eatery-nearby";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCoord(value: string | null): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Map discovery — Google Places Nearby (food). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = parseCoord(params.get("lat"));
  const lng = parseCoord(params.get("lng"));
  const maxRaw = parseCoord(params.get("max"));
  const radiusRaw = parseCoord(params.get("radiusM"));
  const maxResults = maxRaw != null ? Math.min(Math.max(Math.round(maxRaw), 1), 8) : 5;
  const radiusM = radiusRaw != null ? Math.min(Math.max(Math.round(radiusRaw), 100), 2000) : 500;

  if (lat == null || lng == null) {
    return NextResponse.json({ error: "lat_lng_required" }, { status: 400 });
  }

  const inventory = await fetchPlacesEateryNearby({ lat, lng, maxResults, radiusM });

  return NextResponse.json({
    ok: true,
    inventory,
    source: inventory.length > 0 ? "google_places" : "empty",
  });
}
