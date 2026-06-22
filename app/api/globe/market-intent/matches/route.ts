import { type NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveServerMarketAlignmentOffer } from "@/lib/globe/market/server/resolve-server-market-matches";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, offer: null });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const focusEventId =
    request.nextUrl.searchParams.get("focusEventId")?.trim() || null;

  try {
    const offer = await resolveServerMarketAlignmentOffer({
      supabase,
      userId: user.id,
      focusEventId,
    });
    return NextResponse.json({ ok: true, offer });
  } catch {
    return NextResponse.json({ error: "match_failed" }, { status: 500 });
  }
}
