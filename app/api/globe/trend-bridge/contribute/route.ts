import { type NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getTrendBridgeFeature } from "@/lib/globe/trend-bridge/trend-bridge-feature-registry";
import { insertTrendBridgeContribution } from "@/lib/globe/trend-bridge/server/insert-trend-bridge-contribution";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const bridgeId =
    typeof (body as { bridgeId?: unknown }).bridgeId === "string"
      ? (body as { bridgeId: string }).bridgeId.trim()
      : "";
  const captureAtIso =
    typeof (body as { captureAtIso?: unknown }).captureAtIso === "string"
      ? (body as { captureAtIso: string }).captureAtIso.trim()
      : "";
  const placeLabel =
    typeof (body as { placeLabel?: unknown }).placeLabel === "string"
      ? (body as { placeLabel: string }).placeLabel.trim()
      : "";
  const sourceCaptureId =
    typeof (body as { sourceCaptureId?: unknown }).sourceCaptureId === "string"
      ? (body as { sourceCaptureId: string }).sourceCaptureId.trim()
      : "";

  if (!bridgeId || !getTrendBridgeFeature(bridgeId)) {
    return NextResponse.json({ error: "invalid_bridge_id" }, { status: 400 });
  }
  if (!captureAtIso || !placeLabel || !sourceCaptureId) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const lat = (body as { lat?: unknown }).lat;
  const lng = (body as { lng?: unknown }).lng;

  const result = await insertTrendBridgeContribution(supabase, {
    userId: user.id,
    bridgeId,
    captureAtIso,
    placeLabel,
    sourceCaptureId,
    lat: typeof lat === "number" && Number.isFinite(lat) ? lat : null,
    lng: typeof lng === "number" && Number.isFinite(lng) ? lng : null,
    sentiment:
      typeof (body as { sentiment?: unknown }).sentiment === "string"
        ? (body as { sentiment: string }).sentiment
        : null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
