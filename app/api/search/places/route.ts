/**
 * Server-side place search for Context Workspace / Tool Registry.
 * Browser must call this — GOOGLE_PLACES / LITEAPI keys are server-only.
 */

import { NextResponse, type NextRequest } from "next/server";
import { runPlaceSearchAsync } from "@/lib/search-engine/run-place-search-async";
import type { PlaceSearchHit } from "@/lib/search-engine/run-place-search";
import {
  isGooglePlacesConfigured,
} from "@/lib/locate/google-places-config";
import { isLiteApiConfigured } from "@/lib/globe/context-hub/providers/liteapi/liteapi-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOMAINS = new Set(["lodging", "eatery", "poi", "amenity"]);

function parseCoord(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseDomain(value: unknown): PlaceSearchHit["domain"] {
  const d = typeof value === "string" ? value.trim() : "";
  if (DOMAINS.has(d)) {
    return d as PlaceSearchHit["domain"];
  }
  return "lodging";
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const query =
    (typeof body.query === "string" ? body.query.trim() : "") ||
    (typeof body.q === "string" ? body.q.trim() : "");
  const domain = parseDomain(body.domain);
  const lat = parseCoord(body.lat ?? body.anchorLat);
  const lng = parseCoord(body.lng ?? body.anchorLng);
  const limitRaw = parseCoord(body.limit ?? body.max);
  const limit =
    limitRaw != null ? Math.min(Math.max(Math.round(limitRaw), 1), 12) : 4;
  const checkInIso =
    typeof body.checkInIso === "string" ? body.checkInIso.trim() || null : null;
  const checkOutIso =
    typeof body.checkOutIso === "string"
      ? body.checkOutIso.trim() || null
      : null;
  const guestCount = parseCoord(body.guestCount);

  if (!query || query.length < 1) {
    return NextResponse.json({ error: "query_required" }, { status: 400 });
  }

  const hits = await runPlaceSearchAsync({
    query,
    domain,
    anchorLat: lat,
    anchorLng: lng,
    limit,
    checkInIso,
    checkOutIso,
    guestCount: guestCount ?? null,
    allowSeedFallback: false,
  });

  return NextResponse.json({
    ok: true,
    hits,
    count: hits.length,
    providers: {
      googlePlaces: isGooglePlacesConfigured(),
      liteapi: isLiteApiConfigured(),
    },
  });
}
