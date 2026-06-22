import { type NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getTrendBridgeFeature } from "@/lib/globe/trend-bridge/trend-bridge-feature-registry";
import { listTrendBridgeRollupsNear } from "@/lib/globe/trend-bridge/server/run-trend-bridge-rollup-batch";
import { runTrendBridgeRollupBatch } from "@/lib/globe/trend-bridge/server/run-trend-bridge-rollup-batch";

function parseDaySegment(raw: string | null): "weekday" | "weekend" | null {
  if (raw === "weekday" || raw === "weekend") {
    return raw;
  }
  return null;
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, rollups: [] });
  }

  const params = request.nextUrl.searchParams;
  const bridgeId = params.get("bridgeId")?.trim() ?? "";
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const daySegment = parseDaySegment(params.get("daySegment"));

  if (!bridgeId || !getTrendBridgeFeature(bridgeId)) {
    return NextResponse.json({ error: "invalid_bridge_id" }, { status: 400 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !daySegment) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rollups = await listTrendBridgeRollupsNear(supabase, {
    bridgeId,
    lat,
    lng,
    daySegment,
    radiusKm: 12,
    limit: 6,
  });

  return NextResponse.json({
    ok: true,
    rollups: rollups.map((row) => ({
      id: row.id,
      location_dong: row.location_dong,
      peak_hour_label: row.peak_hour_label,
      trend_velocity: row.trend_velocity,
      context_summary: row.context_summary,
      hotspot_lat: row.hotspot_lat,
      hotspot_lng: row.hotspot_lng,
      contributor_count: row.contributor_count,
    })),
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.TREND_BRIDGE_ROLLUP_SECRET?.trim();
  const auth = request.headers.get("authorization")?.trim() ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_role_missing" }, { status: 503 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const minContributors =
    typeof (body as { minContributors?: unknown }).minContributors === "number"
      ? Math.max(3, (body as { minContributors: number }).minContributors)
      : 5;
  const lookbackDays =
    typeof (body as { lookbackDays?: unknown }).lookbackDays === "number"
      ? Math.max(7, (body as { lookbackDays: number }).lookbackDays)
      : 90;

  const result = await runTrendBridgeRollupBatch(admin, {
    minContributors,
    lookbackDays,
  });

  return NextResponse.json({ ok: true, ...result });
}
