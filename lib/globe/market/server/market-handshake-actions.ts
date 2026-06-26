import { copy } from "@/lib/copy/human-ko";
import {
  findMarketHandshakeById,
  findMarketHandshakeByThreadId,
  patchMarketHandshake,
  updateMarketHandshakePhase,
} from "@/lib/globe/market/server/market-alignment-handshake-store";
import { findMarketIntentById } from "@/lib/globe/market/server/upsert-market-intent";
import { marketCategoryLabelKo } from "@/lib/globe/market/market-category-registry";
import type {
  MarketCompletionTraceDraft,
  MarketHandshakeRecord,
} from "@/lib/globe/market/market-handshake-types";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import {
  buildMarketCompletionTraceDraft,
  resolveRealizedPriceKrw,
} from "@/lib/globe/market/build-market-completion-trace-draft";
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
  if (handshake.phase === "pending_buyer_start" && handshake.threadId) {
    return { threadId: handshake.threadId, handshakeId: handshake.id };
  }
  if (handshake.phase !== "pending_listing") {
    throw new Error("invalid_phase");
  }

  const listingIntent = await findMarketIntentById(supabase, handshake.listingIntentId);
  const seekingIntent = await findMarketIntentById(supabase, handshake.seekingIntentId);
  if (!listingIntent || !seekingIntent) {
    throw new Error("intent_not_found");
  }

  const seekingProfile = await fetchPeerPublicProfileByUserId(
    supabase,
    handshake.seekingUserId,
  );

  const dm = await completeDmFriendAdd(supabase, {
    otherUserId: handshake.seekingUserId,
    friendDisplayName:
      seekingProfile?.displayName?.trim() ||
      seekingIntent.detail.productName ||
      copy.globe.marketAlignBridgeThreadLabel,
  });
  const threadId = dm.threadId;

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

  const { initializeMarketTradeSession } = await import(
    "@/lib/globe/market/server/initialize-market-trade-session"
  );
  await initializeMarketTradeSession(supabase, handshake.id, listingIntent);

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

async function deactivateMarketIntents(
  supabase: SupabaseClient,
  seekingIntentId: string,
  listingIntentId: string,
): Promise<string[]> {
  const now = new Date().toISOString();
  const { data: rows, error: readError } = await supabase
    .from("market_intents")
    .select("client_event_id")
    .in("id", [seekingIntentId, listingIntentId]);

  if (readError) {
    throw readError;
  }

  const { error } = await supabase
    .from("market_intents")
    .update({ active: false, updated_at: now })
    .in("id", [seekingIntentId, listingIntentId]);

  if (error) {
    throw error;
  }

  return (rows ?? [])
    .map((row) =>
      typeof row.client_event_id === "string" ? row.client_event_id.trim() : "",
    )
    .filter((eventId) => eventId.length > 0);
}

export async function confirmMarketHandshakeComplete(
  supabase: SupabaseClient,
  userId: string,
  handshakeId: string,
): Promise<{
  completed: boolean;
  awaitingOtherParty: boolean;
  handshake: MarketHandshakeRecord;
  trace: MarketCompletionTraceDraft | null;
  deactivatedEventIds: string[];
}> {
  const handshake = await findMarketHandshakeById(supabase, handshakeId);
  if (!handshake) {
    throw new Error("handshake_not_found");
  }
  if (handshake.seekingUserId !== userId && handshake.listingUserId !== userId) {
    throw new Error("forbidden");
  }
  if (handshake.phase !== "active" && handshake.phase !== "completed") {
    throw new Error("invalid_phase");
  }

  const viewerRole: MarketIntentRole =
    userId === handshake.seekingUserId ? "seeking" : "listing";

  const listingIntent = await findMarketIntentById(supabase, handshake.listingIntentId);
  if (!listingIntent) {
    throw new Error("intent_not_found");
  }

  const priceLine = formatPriceLine(listingIntent.priceMinKrw, listingIntent.priceMaxKrw);

  if (handshake.phase === "completed") {
    const trace = buildMarketCompletionTraceDraft({
      handshake,
      viewerRole,
      viewerUserId: userId,
      productName: listingIntent.detail.productName || listingIntent.title,
      priceLine,
      placeLabel: listingIntent.placeLabel,
      lat: listingIntent.anchorLat,
      lng: listingIntent.anchorLng,
    });
    return {
      completed: true,
      awaitingOtherParty: false,
      handshake,
      trace,
      deactivatedEventIds: [],
    };
  }

  const viewerConfirmed =
    viewerRole === "seeking"
      ? Boolean(handshake.seekingConfirmedAtIso)
      : Boolean(handshake.listingConfirmedAtIso);

  if (viewerConfirmed) {
    throw new Error("already_confirmed");
  }

  const nowIso = new Date().toISOString();
  const realizedPriceKrw = resolveRealizedPriceKrw(
    listingIntent.priceMinKrw,
    listingIntent.priceMaxKrw,
  );

  const seekingConfirmedAtIso =
    viewerRole === "seeking" ? nowIso : handshake.seekingConfirmedAtIso;
  const listingConfirmedAtIso =
    viewerRole === "listing" ? nowIso : handshake.listingConfirmedAtIso;

  const otherConfirmed =
    viewerRole === "seeking"
      ? Boolean(handshake.listingConfirmedAtIso)
      : Boolean(handshake.seekingConfirmedAtIso);

  if (!otherConfirmed) {
    const patched = await patchMarketHandshake(supabase, handshake.id, {
      seekingConfirmedAtIso,
      listingConfirmedAtIso,
      realizedPriceKrw,
    });

    if (handshake.threadId) {
      await insertPeerMessage(supabase, {
        threadId: handshake.threadId,
        senderUserId: userId,
        messageType: "system",
        body:
          viewerRole === "seeking"
            ? copy.globe.marketHandshakeSeekingConfirmedSystem
            : copy.globe.marketHandshakeListingConfirmedSystem,
      });
    }

    return {
      completed: false,
      awaitingOtherParty: true,
      handshake: patched,
      trace: null,
      deactivatedEventIds: [],
    };
  }

  const patched = await patchMarketHandshake(supabase, handshake.id, {
    phase: "completed",
    seekingConfirmedAtIso,
    listingConfirmedAtIso,
    realizedPriceKrw,
    completedAtIso: nowIso,
    tradeStatus: "completed",
  });

  const deactivatedEventIds = await deactivateMarketIntents(
    supabase,
    handshake.seekingIntentId,
    handshake.listingIntentId,
  );

  if (handshake.threadId) {
    await insertPeerMessage(supabase, {
      threadId: handshake.threadId,
      senderUserId: userId,
      messageType: "system",
      body: copy.globe.marketHandshakeCompletedSystem({
        productName: listingIntent.detail.productName || listingIntent.title,
        priceLine,
        place: listingIntent.placeLabel || "근처",
      }),
    });
  }

  const trace = buildMarketCompletionTraceDraft({
    handshake: patched,
    viewerRole,
    viewerUserId: userId,
    productName: listingIntent.detail.productName || listingIntent.title,
    priceLine,
    placeLabel: listingIntent.placeLabel,
    lat: listingIntent.anchorLat,
    lng: listingIntent.anchorLng,
  });

  return {
    completed: true,
    awaitingOtherParty: false,
    handshake: patched,
    trace,
    deactivatedEventIds,
  };
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
