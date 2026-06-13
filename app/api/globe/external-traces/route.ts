import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import {
  EXTERNAL_GLOBE_TRACE_DEFAULT_RADIUS_M,
  filterExternalTracesNear,
} from "@/lib/globe/server-external-globe-traces";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

function readCoord(value: string | null): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** P2 — discover others' external experience traces near a point. */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ traces: [] });
  }

  try {
    const user = await requireAuthUser();
    const params = request.nextUrl.searchParams;
    const lat = readCoord(params.get("lat"));
    const lng = readCoord(params.get("lng"));
    if (lat == null || lng == null) {
      return NextResponse.json({ error: "lat_lng_required" }, { status: 400 });
    }

    const radiusRaw = readCoord(params.get("radiusM"));
    const radiusM = radiusRaw ?? EXTERNAL_GLOBE_TRACE_DEFAULT_RADIUS_M;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("personal_globe_pins")
      .select("id,user_id,event_id,pin,visibility,lat,lng,updated_at")
      .eq("visibility", "external")
      .limit(120);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const traces = filterExternalTracesNear({
      rows: data ?? [],
      lat,
      lng,
      radiusM,
      excludeUserId: user.id,
    });

    return NextResponse.json({ traces });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "fetch_failed";
    const status = message.includes("auth") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
