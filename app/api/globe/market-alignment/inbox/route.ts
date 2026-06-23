import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveServerMarketInboxOffers } from "@/lib/globe/market/server/resolve-server-market-inbox";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, offers: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const offers = await resolveServerMarketInboxOffers({
      supabase,
      userId: user.id,
    });
    return NextResponse.json({ ok: true, offers });
  } catch {
    return NextResponse.json({ error: "inbox_failed" }, { status: 500 });
  }
}
