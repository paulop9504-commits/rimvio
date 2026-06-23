import { type NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { buildMarketHandshakeRoomPayload } from "@/lib/globe/market/server/build-market-handshake-room-state";
import { findMarketHandshakeByThreadId } from "@/lib/globe/market/server/market-alignment-handshake-store";
import { findMarketIntentById } from "@/lib/globe/market/server/upsert-market-intent";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, handshake: null });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const threadId = request.nextUrl.searchParams.get("threadId")?.trim() || "";
  if (!threadId) {
    return NextResponse.json({ error: "thread_required" }, { status: 400 });
  }

  const handshake = await findMarketHandshakeByThreadId(supabase, threadId);
  if (!handshake) {
    return NextResponse.json({ ok: true, handshake: null });
  }
  if (handshake.seekingUserId !== user.id && handshake.listingUserId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const listingIntent = await findMarketIntentById(supabase, handshake.listingIntentId);
  if (!listingIntent) {
    return NextResponse.json({ ok: true, handshake: null });
  }

  const seekingIntent = await findMarketIntentById(supabase, handshake.seekingIntentId);

  return NextResponse.json({
    ok: true,
    handshake: buildMarketHandshakeRoomPayload({
      handshake,
      listingIntent,
      seekingIntent,
      viewerUserId: user.id,
    }),
  });
}
