import { NextResponse, type NextRequest } from "next/server";
import { resolveLocationFromText } from "@/lib/location-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Location Engine — text → Location Entity (Reality Graph → registry → Nominatim). */
export async function GET(request: NextRequest) {
  const q = (
    request.nextUrl.searchParams.get("q") ??
    request.nextUrl.searchParams.get("query") ??
    ""
  ).trim();
  if (!q) {
    return NextResponse.json({ error: "query_required" }, { status: 400 });
  }

  const result = await resolveLocationFromText(q);
  if (!result) {
    return NextResponse.json({
      ok: false,
      query: q,
      entity: null,
      providersTried: [],
    });
  }

  return NextResponse.json({
    ok: true,
    query: q,
    entity: result.entity,
    providersTried: result.providersTried,
  });
}
