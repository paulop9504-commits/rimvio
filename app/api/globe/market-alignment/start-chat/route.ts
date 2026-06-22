import { type NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { startBuyerMarketHandshakeChat } from "@/lib/globe/market/server/market-handshake-actions";

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

  const handshakeId =
    typeof (body as { handshakeId?: unknown }).handshakeId === "string"
      ? (body as { handshakeId: string }).handshakeId.trim()
      : "";
  if (!handshakeId) {
    return NextResponse.json({ error: "handshake_required" }, { status: 400 });
  }

  try {
    const result = await startBuyerMarketHandshakeChat(supabase, user.id, handshakeId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "start_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
