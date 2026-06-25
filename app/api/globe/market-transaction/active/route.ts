import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { marketTradeSessionCopy } from "@/lib/globe/market/market-trade-copy";
import { listActiveMarketTradeSessionsForUser } from "@/lib/globe/market/server/market-trade-session-server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, sessions: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const sessions = await listActiveMarketTradeSessionsForUser(
      supabase,
      user.id,
      marketTradeSessionCopy,
    );
    return NextResponse.json({ ok: true, sessions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "trade_list_failed";
    if (message.includes("trade_status") || message.includes("column")) {
      return NextResponse.json({ ok: true, sessions: [], migrationPending: true });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
