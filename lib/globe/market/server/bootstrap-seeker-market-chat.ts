import { copy } from "@/lib/copy/human-ko";
import { marketCategoryLabelKo } from "@/lib/globe/market/market-category-registry";
import { isMarketIntentPublishedExternal } from "@/lib/globe/market/market-intent-detail";
import {
  findMarketHandshakeByIntentPair,
  upsertMarketHandshake,
} from "@/lib/globe/market/server/market-alignment-handshake-store";
import {
  startBuyerMarketHandshakeChat,
} from "@/lib/globe/market/server/market-handshake-actions";
import {
  findMarketIntentById,
  listOwnMarketIntents,
} from "@/lib/globe/market/server/upsert-market-intent";
import { isListingCandidateForSeeking } from "@/lib/globe/opportunity-field/filter-listing-candidates";
import { OPPORTUNITY_FIELD_MIN_FIELD_SCORE } from "@/lib/globe/opportunity-field/observation-constants";
import { scoreWeightedMarketAlignment } from "@/lib/globe/market/score-weighted-market-alignment";
import { completeDmFriendAdd } from "@/lib/peer-chat/dm-friend-add-server";
import { insertPeerMessage } from "@/lib/peer-chat/server-peer-chat";
import { fetchPeerPublicProfileByUserId } from "@/lib/peer-chat/peer-public-profile";
import type { SupabaseClient } from "@supabase/supabase-js";

function formatPriceLine(priceMin: number | null, priceMax: number | null): string {
  if (priceMin !== null && priceMax !== null && priceMin === priceMax) {
    return `${Math.round(priceMin / 10_000)}만원`;
  }
  if (priceMax !== null) {
    return `${Math.round(priceMax / 10_000)}만원 이하`;
  }
  if (priceMin !== null) {
    return `${Math.round(priceMin / 10_000)}만원 이상`;
  }
  return copy.globe.marketIntentPriceOpen;
}

async function eagerOpenSeekerMarketThread(
  supabase: SupabaseClient,
  userId: string,
  handshake: Awaited<ReturnType<typeof findMarketHandshakeByIntentPair>>,
  options: { initTradeSession: boolean; requireTradeSession: boolean },
): Promise<string> {
  if (!handshake) {
    throw new Error("handshake_not_found");
  }

  const listingIntent = await findMarketIntentById(supabase, handshake.listingIntentId);
  if (!listingIntent) {
    throw new Error("intent_not_found");
  }

  const listingProfile = await fetchPeerPublicProfileByUserId(
    supabase,
    handshake.listingUserId,
  );

  const dm = await completeDmFriendAdd(supabase, {
    otherUserId: handshake.listingUserId,
    friendDisplayName:
      listingProfile?.displayName?.trim() ||
      listingIntent.detail.productName ||
      listingIntent.title ||
      copy.globe.marketAlignBridgeThreadLabel,
  });

  const category = marketCategoryLabelKo(listingIntent.categoryId);
  const priceLine = formatPriceLine(listingIntent.priceMinKrw, listingIntent.priceMaxKrw);
  const now = new Date().toISOString();

  await insertPeerMessage(supabase, {
    threadId: dm.threadId,
    senderUserId: userId,
    messageType: "system",
    body: copy.globe.marketHandshakePreviewSystemMessage({
      productName: listingIntent.detail.productName || listingIntent.title,
      priceLine,
      category,
      place: listingIntent.placeLabel || "근처",
      priorityHint: handshake.priorityHint,
    }),
  });

  const { updateMarketHandshakePhase } = await import(
    "@/lib/globe/market/server/market-alignment-handshake-store"
  );
  await updateMarketHandshakePhase(supabase, handshake.id, {
    phase: "active",
    threadId: dm.threadId,
    listingAcceptedAtIso: now,
    buyerStartedAtIso: now,
  });

  const { tryInitializeMarketTradeSession } = await import(
    "@/lib/globe/market/server/initialize-market-trade-session"
  );
  if (options.initTradeSession) {
    const ok = await tryInitializeMarketTradeSession(supabase, handshake.id, listingIntent);
    if (!ok && options.requireTradeSession) {
      throw new Error("trade_init_failed");
    }
  }

  return dm.threadId;
}

/** Seeker taps chat from field — open DM immediately (Karrot-style, no listing accept gate). */
export async function bootstrapSeekerMarketChat(
  supabase: SupabaseClient,
  userId: string,
  input: {
    focusEventId: string;
    seekingIntentId?: string | null;
    matchIntentId: string;
    initialMessage?: string | null;
    initTradeSession?: boolean;
    requireTradeSession?: boolean;
  },
): Promise<{ threadId: string; handshakeId: string }> {
  let seeking: Awaited<ReturnType<typeof findMarketIntentById>> = null;

  const seekingIntentId = input.seekingIntentId?.trim() ?? "";
  if (seekingIntentId) {
    const row = await findMarketIntentById(supabase, seekingIntentId);
    if (row?.userId === userId && row.role === "seeking" && row.active) {
      seeking = row;
    }
  }

  if (!seeking) {
    const own = await listOwnMarketIntents(supabase, userId);
    seeking =
      own.find(
        (row) => row.eventId === input.focusEventId.trim() && row.role === "seeking",
      ) ?? null;
  }

  if (!seeking) {
    throw new Error("seeking_not_found");
  }

  const listing = await findMarketIntentById(supabase, input.matchIntentId.trim());
  if (
    !listing?.active ||
    listing.role !== "listing" ||
    !listing.userId ||
    !isMarketIntentPublishedExternal(listing.detail)
  ) {
    throw new Error("listing_not_found");
  }

  if (!isListingCandidateForSeeking(seeking, listing)) {
    throw new Error("no_match");
  }

  const weighted = scoreWeightedMarketAlignment(seeking, listing);
  const fieldFloor = OPPORTUNITY_FIELD_MIN_FIELD_SCORE * 0.72;
  if (weighted.total < fieldFloor) {
    throw new Error("no_match");
  }

  const hint =
    weighted.topMatchedLabelsKo.length > 0
      ? `${weighted.topMatchedLabelsKo.join(" · ")} 맞음`
      : "";

  await upsertMarketHandshake(supabase, {
    seekingIntentId: seeking.id,
    listingIntentId: listing.id,
    seekingUserId: userId,
    listingUserId: listing.userId,
    alignmentScore: weighted.total,
    priorityHint: hint,
  });

  const handshake = await findMarketHandshakeByIntentPair(
    supabase,
    seeking.id,
    listing.id,
  );
  if (!handshake) {
    throw new Error("handshake_not_found");
  }

  const initTradeSession = input.initTradeSession === true;
  const requireTradeSession = input.requireTradeSession === true;
  const tradeOptions = { initTradeSession, requireTradeSession };

  let threadId = handshake.threadId;

  if (handshake.phase === "active" && threadId) {
    if (initTradeSession && handshake.scheduleCandidates.length === 0) {
      const listingForTrade = listing;
      const { tryInitializeMarketTradeSession } = await import(
        "@/lib/globe/market/server/initialize-market-trade-session"
      );
      const ok = await tryInitializeMarketTradeSession(
        supabase,
        handshake.id,
        listingForTrade,
      );
      if (!ok && requireTradeSession) {
        throw new Error("trade_init_failed");
      }
    }
  } else if (handshake.phase === "pending_buyer_start" && threadId) {
    await startBuyerMarketHandshakeChat(supabase, userId, handshake.id);
  } else if (handshake.phase === "pending_listing" || !threadId) {
    threadId = await eagerOpenSeekerMarketThread(
      supabase,
      userId,
      handshake,
      tradeOptions,
    );
  } else if (handshake.phase === "completed") {
    throw new Error("handshake_completed");
  } else if (!threadId) {
    throw new Error("thread_missing");
  }

  const trimmedMessage = input.initialMessage?.trim() ?? "";
  if (trimmedMessage && threadId) {
    await insertPeerMessage(supabase, {
      threadId,
      senderUserId: userId,
      body: trimmedMessage,
    });
  }

  return { threadId: threadId!, handshakeId: handshake.id };
}
