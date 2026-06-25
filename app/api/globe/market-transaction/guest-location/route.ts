import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { pingMarketTradeGuestLocation } from "@/lib/globe/market/server/market-trade-session-server";
import { readMarketHandshakeUserError } from "@/lib/globe/market/read-market-handshake-user-error";

export async function POST(request: Request) {
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

  const row = body as Record<string, unknown>;
  const handshakeId =
    typeof row.handshakeId === "string" ? row.handshakeId.trim() : "";
  const lat = typeof row.lat === "number" ? row.lat : NaN;
  const lng = typeof row.lng === "number" ? row.lng : NaN;

  if (!handshakeId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "handshake_and_coords_required" }, { status: 400 });
  }

  try {
    const session = await pingMarketTradeGuestLocation(supabase, user.id, {
      handshakeId,
      lat,
      lng,
    });
    return NextResponse.json({ ok: true, session });
  } catch (error) {
    const message = readMarketHandshakeUserError(
      error instanceof Error ? error.message : "ping_failed",
    );
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
