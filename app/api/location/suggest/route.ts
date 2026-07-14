import { NextResponse, type NextRequest } from "next/server";
import { suggestLocationsFromText } from "@/lib/location-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Location Engine autocomplete — prefix → Location Entities. */
export async function GET(request: NextRequest) {
  const q = (
    request.nextUrl.searchParams.get("q") ??
    request.nextUrl.searchParams.get("query") ??
    ""
  ).trim();
  if (!q) {
    return NextResponse.json({ error: "query_required" }, { status: 400 });
  }
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "5");
  const limit = Number.isFinite(limitRaw) ? Math.min(8, Math.max(1, limitRaw)) : 5;

  const suggestions = await suggestLocationsFromText(q, limit);
  return NextResponse.json({
    ok: true,
    query: q,
    suggestions,
  });
}
