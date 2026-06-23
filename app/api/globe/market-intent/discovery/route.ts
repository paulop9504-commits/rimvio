import { type NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { listActiveMarketIntentsForMatching } from "@/lib/globe/market/server/upsert-market-intent";
import { haversineKm } from "@/lib/globe/trend-bridge/server/trend-bridge-geo";

function parseCoord(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** 밖 지구 — read-only @중고 projections from other users. */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, intents: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const lat = parseCoord(request.nextUrl.searchParams.get("lat"));
  const lng = parseCoord(request.nextUrl.searchParams.get("lng"));
  const radiusKm = parseCoord(request.nextUrl.searchParams.get("radiusKm")) ?? 15;

  try {
    const rows = await listActiveMarketIntentsForMatching(supabase, {
      excludeUserId: user.id,
      limit: 200,
      publishedOnly: true,
    });

    const filtered =
      lat != null && lng != null
        ? rows.filter((row) => {
            const distance = haversineKm(lat, lng, row.anchorLat, row.anchorLng);
            const reach = Math.max(row.radiusKm, radiusKm);
            return distance <= reach;
          })
        : rows;

    return NextResponse.json({ ok: true, intents: filtered });
  } catch {
    return NextResponse.json({ error: "discovery_failed" }, { status: 500 });
  }
}
