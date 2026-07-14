import { NextResponse, type NextRequest } from "next/server";
import { resolveLocationFromCoords } from "@/lib/location-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCoord(value: string | null): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Location Engine — GPS → Location Entity (reverse). */
export async function GET(request: NextRequest) {
  const lat = parseCoord(request.nextUrl.searchParams.get("lat"));
  const lng = parseCoord(request.nextUrl.searchParams.get("lng"));
  if (lat == null || lng == null) {
    return NextResponse.json({ error: "lat_lng_required" }, { status: 400 });
  }

  const result = await resolveLocationFromCoords(lat, lng);
  if (!result) {
    return NextResponse.json({
      ok: false,
      lat,
      lng,
      entity: null,
      providersTried: [],
    });
  }

  return NextResponse.json({
    ok: true,
    lat,
    lng,
    entity: result.entity,
    providersTried: result.providersTried,
  });
}
