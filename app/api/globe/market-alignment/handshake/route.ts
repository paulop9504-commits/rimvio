import { type NextRequest, NextResponse } from "next/server";
import { copy } from "@/lib/copy/human-ko";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { marketCategoryLabelKo } from "@/lib/globe/market/market-category-registry";
import {
  findMarketHandshakeByThreadId,
} from "@/lib/globe/market/server/market-alignment-handshake-store";
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

  const priceLine =
    listingIntent.priceMinKrw !== null && listingIntent.priceMaxKrw !== null
      ? listingIntent.priceMinKrw === listingIntent.priceMaxKrw
        ? `${Math.round(listingIntent.priceMinKrw / 10_000)}만원`
        : `${Math.round((listingIntent.priceMinKrw ?? 0) / 10_000)}~${Math.round((listingIntent.priceMaxKrw ?? 0) / 10_000)}만원`
      : copy.globe.marketIntentPriceOpen;

  const viewerRole =
    user.id === handshake.seekingUserId
      ? "seeking"
      : user.id === handshake.listingUserId
        ? "listing"
        : null;

  return NextResponse.json({
    ok: true,
    handshake: {
      id: handshake.id,
      phase: handshake.phase,
      threadId: handshake.threadId,
      priorityHint: handshake.priorityHint,
      viewerRole,
      chatLocked: handshake.phase === "pending_buyer_start",
      canStartChat:
        handshake.phase === "pending_buyer_start" && viewerRole === "seeking",
      product: {
        title: listingIntent.detail.productName || listingIntent.title,
        priceLine,
        category: marketCategoryLabelKo(listingIntent.categoryId),
        placeLabel: listingIntent.placeLabel,
        photoCount: listingIntent.detail.photoCount,
        prioritySlots: listingIntent.detail.prioritySlots,
      },
    },
  });
}
