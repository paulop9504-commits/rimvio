import { copy } from "@/lib/copy/human-ko";
import { marketCategoryLabelKo } from "@/lib/globe/market/market-category-registry";
import type { MarketCompletionTraceDraft } from "@/lib/globe/market/market-handshake-types";
import type { MarketHandshakeRecord } from "@/lib/globe/market/market-handshake-types";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { buildMarketCompletionTraceDraft } from "@/lib/globe/market/build-market-completion-trace-draft";
import { formatMarketPlaceLabel } from "@/lib/globe/market/format-market-place-label";
import { formatMarketMemoryPreview } from "@/lib/globe/market/memory/format-market-memory-preview";
import { readMarketMemoryRecord } from "@/lib/globe/market/market-intent-detail";

import { formatMarketPriceLine } from "@/lib/globe/market/format-market-price-line";
import type { RegionalProfile } from "@/lib/preferences/regional-profile";
import { resolveRegionalProfile } from "@/lib/preferences/regional-profile";

export type MarketHandshakeRoomPayload = {
  id: string;
  phase: string;
  threadId: string | null;
  priorityHint: string;
  viewerRole: "seeking" | "listing" | null;
  chatLocked: boolean;
  canStartChat: boolean;
  canConfirmComplete: boolean;
  viewerConfirmed: boolean;
  otherPartyConfirmed: boolean;
  awaitingOtherParty: boolean;
  completed: boolean;
  /** Listing viewer — buyer tapped depart and is en route. */
  buyerEnRouteLabel: string | null;
  trace: MarketCompletionTraceDraft | null;
  product: {
    title: string;
    priceLine: string;
    category: string;
    placeLabel: string;
    listingEventId: string;
    photoCount: number;
    photoUrls: string[];
    videoUrls?: string[];
    memoryPlaceLabel: string | null;
    memoryPreview: string | null;
    experienceTags: string[];
    matchMemoryPreview: string | null;
    matchExperienceTags: string[];
  };
};

export function buildMarketHandshakeRoomPayload(input: {
  handshake: MarketHandshakeRecord;
  listingIntent: MarketIntentRecord;
  seekingIntent?: MarketIntentRecord | null;
  viewerUserId: string;
  regionalProfile?: RegionalProfile;
}): MarketHandshakeRoomPayload {
  const { handshake, listingIntent, viewerUserId } = input;
  const seekingIntent = input.seekingIntent ?? null;
  const profile = input.regionalProfile ?? resolveRegionalProfile("KR");
  const priceLine = formatMarketPriceLine(
    listingIntent.priceMinKrw,
    listingIntent.priceMaxKrw,
    profile,
  );

  const viewerRole =
    viewerUserId === handshake.seekingUserId
      ? "seeking"
      : viewerUserId === handshake.listingUserId
        ? "listing"
        : null;

  const viewerConfirmed =
    viewerRole === "seeking"
      ? Boolean(handshake.seekingConfirmedAtIso)
      : viewerRole === "listing"
        ? Boolean(handshake.listingConfirmedAtIso)
        : false;

  const otherPartyConfirmed =
    viewerRole === "seeking"
      ? Boolean(handshake.listingConfirmedAtIso)
      : viewerRole === "listing"
        ? Boolean(handshake.seekingConfirmedAtIso)
        : false;

  const completed = handshake.phase === "completed";
  const active = handshake.phase === "active";

  const trace =
    completed && viewerRole
      ? buildMarketCompletionTraceDraft({
          handshake,
          viewerRole,
          viewerUserId,
          productName: listingIntent.detail.productName || listingIntent.title,
          priceLine,
          placeLabel: listingIntent.placeLabel,
          lat: listingIntent.anchorLat,
          lng: listingIntent.anchorLng,
        })
      : null;

  const listingMemory = readMarketMemoryRecord(listingIntent.detail);
  const matchMemoryPreview =
    seekingIntent && viewerRole === "listing"
      ? formatMarketMemoryPreview(seekingIntent.detail, "seeking")
      : seekingIntent && viewerRole === "seeking"
        ? formatMarketMemoryPreview(seekingIntent.detail, "seeking")
        : null;

  const buyerEnRouteLabel =
    viewerRole === "listing" && handshake.tradeStatus === "en_route"
      ? copy.globe.marketTradeStatusEnRouteListing
      : null;

  return {
    id: handshake.id,
    phase: handshake.phase,
    threadId: handshake.threadId,
    priorityHint: handshake.priorityHint,
    viewerRole,
    chatLocked: handshake.phase === "pending_buyer_start",
    canStartChat: handshake.phase === "pending_buyer_start" && viewerRole === "seeking",
    canConfirmComplete: active && Boolean(viewerRole) && !viewerConfirmed,
    viewerConfirmed,
    otherPartyConfirmed,
    awaitingOtherParty: active && viewerConfirmed && !otherPartyConfirmed,
    completed,
    buyerEnRouteLabel,
    trace,
    product: {
      title: listingIntent.detail.productName || listingIntent.title,
      priceLine,
      category: marketCategoryLabelKo(listingIntent.categoryId),
      placeLabel: formatMarketPlaceLabel(listingIntent.placeLabel) || "근처",
      listingEventId: listingIntent.eventId,
      photoCount: listingIntent.detail.photoCount,
      photoUrls: listingIntent.detail.photoUrls ?? [],
      videoUrls: listingIntent.detail.videoUrls ?? [],
      memoryPlaceLabel: listingIntent.detail.memoryPlaceLabel?.trim() || null,
      memoryPreview: formatMarketMemoryPreview(listingIntent.detail, "listing"),
      experienceTags: listingMemory.experienceTags,
      matchMemoryPreview,
      matchExperienceTags: seekingIntent
        ? readMarketMemoryRecord(seekingIntent.detail).experienceTags
        : [],
    },
  };
}
