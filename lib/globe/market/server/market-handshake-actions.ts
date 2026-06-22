import { copy } from "@/lib/copy/human-ko";
import {
  findMarketHandshakeById,
  findMarketHandshakeByThreadId,
  updateMarketHandshakePhase,
} from "@/lib/globe/market/server/market-alignment-handshake-store";
import { findMarketIntentById } from "@/lib/globe/market/server/upsert-market-intent";
import { marketCategoryLabelKo } from "@/lib/globe/market/market-category-registry";
import {
  ensureDmThreadBetweenUsers,
  insertPeerMessage,
} from "@/lib/peer-chat/server-peer-chat";
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

export async function acceptListingMarketHandshake(
  supabase: SupabaseClient,
  userId: string,
  handshakeId: string,
): Promise<{ threadId: string; handshakeId: string }> {
  const handshake = await findMarketHandshakeById(supabase, handshakeId);
  if (!handshake) {
    throw new Error("handshake_not_found");
  }
  if (handshake.listingUserId !== userId) {
    throw new Error("listing_only");
  }
  if (handshake.phase !== "pending_listing") {
    throw new Error("invalid_phase");
  }

  const listingIntent = await findMarketIntentById(supabase, handshake.listingIntentId);
  const seekingIntent = await findMarketIntentById(supabase, handshake.seekingIntentId);
  if (!listingIntent || !seekingIntent) {
    throw new Error("intent_not_found");
  }

  const callerProfile = await fetchPeerPublicProfileByUserId(supabase, userId);
  const seekingProfile = await fetchPeerPublicProfileByUserId(
    supabase,
    handshake.seekingUserId,
  );

  const { threadId } = await ensureDmThreadBetweenUsers(supabase, {
    callerUserId: userId,
    otherUserId: handshake.seekingUserId,
    callerDisplayName:
      callerProfile?.displayName?.trim() ||
      listingIntent.detail.productName ||
      copy.globe.marketAlignBridgeThreadLabel,
    otherDisplayName:
      seekingProfile?.displayName?.trim() ||
      seekingIntent.detail.productName ||
      copy.globe.marketAlignBridgeThreadLabel,
  });

  const category = marketCategoryLabelKo(listingIntent.categoryId);
  const priceLine = formatPriceLine(listingIntent.priceMinKrw, listingIntent.priceMaxKrw);

  await insertPeerMessage(supabase, {
    threadId,
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

  await updateMarketHandshakePhase(supabase, handshake.id, {
    phase: "pending_buyer_start",
    threadId,
    listingAcceptedAtIso: new Date().toISOString(),
  });

  return { threadId, handshakeId: handshake.id };
}

export async function startBuyerMarketHandshakeChat(
  supabase: SupabaseClient,
  userId: string,
  handshakeId: string,
): Promise<{ threadId: string }> {
  const handshake = await findMarketHandshakeById(supabase, handshakeId);
  if (!handshake) {
    throw new Error("handshake_not_found");
  }
  if (handshake.seekingUserId !== userId) {
    throw new Error("seeker_only");
  }
  if (handshake.phase !== "pending_buyer_start" || !handshake.threadId) {
    throw new Error("invalid_phase");
  }

  const listingIntent = await findMarketIntentById(supabase, handshake.listingIntentId);
  if (!listingIntent) {
    throw new Error("intent_not_found");
  }

  const priceLine = formatPriceLine(listingIntent.priceMinKrw, listingIntent.priceMaxKrw);

  await insertPeerMessage(supabase, {
    threadId: handshake.threadId,
    senderUserId: userId,
    messageType: "system",
    body: copy.globe.marketHandshakeStartSystemMessage({
      productName: listingIntent.detail.productName || listingIntent.title,
      priceLine,
      priorityHint: handshake.priorityHint,
      place: listingIntent.placeLabel || "근처",
    }),
  });

  await updateMarketHandshakePhase(supabase, handshake.id, {
    phase: "active",
    threadId: handshake.threadId,
    buyerStartedAtIso: new Date().toISOString(),
  });

  return { threadId: handshake.threadId };
}

export async function assertMarketHandshakeAllowsSend(
  supabase: SupabaseClient,
  threadId: string,
): Promise<void> {
  const handshake = await findMarketHandshakeByThreadId(supabase, threadId);
  if (!handshake) {
    return;
  }
  if (handshake.phase === "pending_buyer_start") {
    throw new Error("market_chat_locked:구매자가 대화를 시작할 때까지 기다려 주세요.");
  }
  if (handshake.phase === "pending_listing") {
    throw new Error("market_chat_locked:아직 맞춤이 확정되지 않았어요.");
  }
}
