import { type NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { fetchPinPulsePlaceContext } from "@/lib/globe/trend-bridge/server/fetch-pin-pulse-place-context";
import { getTrendBridgeFeature } from "@/lib/globe/trend-bridge/trend-bridge-feature-registry";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, context: null });
  }

  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const placeLabel = params.get("placeLabel")?.trim() ?? "";
  const bridgeId = params.get("bridgeId")?.trim() ?? "food";
  const userCaptureAt = params.get("userCaptureAt")?.trim() ?? null;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }
  if (!getTrendBridgeFeature(bridgeId)) {
    return NextResponse.json({ error: "invalid_bridge_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const context = await fetchPinPulsePlaceContext(supabase, {
    lat,
    lng,
    placeLabel,
    bridgeId,
    userId: user?.id ?? null,
    userCaptureTimestamp: userCaptureAt,
  });

  return NextResponse.json({ ok: true, context });
}
