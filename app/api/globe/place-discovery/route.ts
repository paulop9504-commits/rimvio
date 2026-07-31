import { type NextRequest, NextResponse } from "next/server";
import {
  parseFieldPlaceCoord,
  runFieldPlaceDiscoverySearch,
} from "@/lib/globe/opportunity-field/run-field-place-discovery-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";
export const maxDuration = 60;

/** Field discovery — GPS place cards + globe pin projections (product). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  if (!q) {
    return NextResponse.json(
      { ok: false, query: "", error: "q required" },
      { status: 400 },
    );
  }

  const lat = parseFieldPlaceCoord(params.get("lat"));
  const lng = parseFieldPlaceCoord(params.get("lng"));

  try {
    const payload = await runFieldPlaceDiscoverySearch({
      query: q,
      lat,
      lng,
      includeThought: false,
    });

    if (!payload.ok) {
      return NextResponse.json(payload, { status: 422 });
    }

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { ok: false, query: q, error: "place_discovery_failed" },
      { status: 500 },
    );
  }
}
