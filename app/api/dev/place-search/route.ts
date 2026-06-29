import { NextResponse } from "next/server";

import { devOnlyApiGuard } from "@/lib/dev/assert-dev-only-api";
import {
  parseFieldPlaceCoord,
  runFieldPlaceDiscoverySearch,
} from "@/lib/globe/opportunity-field/run-field-place-discovery-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = devOnlyApiGuard();
  if (blocked) {
    return blocked;
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "쿠우쿠우 맛집 추천";
  const lat = parseFieldPlaceCoord(searchParams.get("lat"));
  const lng = parseFieldPlaceCoord(searchParams.get("lng"));

  const payload = await runFieldPlaceDiscoverySearch({
    query: q,
    lat,
    lng,
    includeThought: true,
  });

  return NextResponse.json(payload);
}
