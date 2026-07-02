import { NextResponse, type NextRequest } from "next/server";
import { buildMarketPriceSnapshot } from "@/lib/commerce/market-price";
import { fetchPlacesLodgingNearby } from "@/lib/globe/context-hub/fetch-places-lodging-nearby";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { resolveLodgingMockNearUser } from "@/lib/globe/context-hub/lodging-mock-inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCoord(value: string | null): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function enrichRowWithMarketPrice(
  row: ContextLodgingInventoryRow,
): Promise<ContextLodgingInventoryRow> {
  if (row.priceKrw != null && Number.isFinite(row.priceKrw)) {
    return row;
  }
  try {
    const snapshot = await buildMarketPriceSnapshot({
      title: `${row.name} 숙박`,
      domain: "lodging",
      listingPriceText: null,
    });
    if (snapshot.median != null && Number.isFinite(snapshot.median)) {
      return { ...row, priceKrw: Math.round(snapshot.median) };
    }
  } catch {
    // market price is best-effort
  }
  return row;
}

/** Globe Hub — GPS anchor → Places lodging + market-price enrichment. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = parseCoord(params.get("lat"));
  const lng = parseCoord(params.get("lng"));
  const maxRaw = parseCoord(params.get("max"));
  const maxResults = maxRaw != null ? Math.min(Math.max(Math.round(maxRaw), 1), 8) : 5;

  if (lat == null || lng == null) {
    return NextResponse.json({ error: "lat_lng_required" }, { status: 400 });
  }

  let inventory = await fetchPlacesLodgingNearby({ lat, lng, maxResults });
  const source: "google_places" | "mock" = inventory.length > 0 ? "google_places" : "mock";

  if (inventory.length === 0) {
    inventory = resolveLodgingMockNearUser({ lat, lng }).slice(0, maxResults);
  }

  const enriched = await Promise.all(
    inventory.slice(0, maxResults).map((row) => enrichRowWithMarketPrice(row)),
  );

  return NextResponse.json({
    ok: true,
    inventory: enriched,
    source,
  });
}
