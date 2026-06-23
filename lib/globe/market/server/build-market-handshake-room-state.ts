import { copy } from "@/lib/copy/human-ko";
import { marketCategoryLabelKo } from "@/lib/globe/market/market-category-registry";
import type { MarketCompletionTraceDraft } from "@/lib/globe/market/market-handshake-types";
import type { MarketHandshakeRecord } from "@/lib/globe/market/market-handshake-types";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { buildMarketCompletionTraceDraft } from "@/lib/globe/market/build-market-completion-trace-draft";
import { formatMarketPlaceLabel } from "@/lib/globe/market/format-market-place-label";
import { formatMarketMemoryPreview } from "@/lib/globe/market/memory/format-market-memory-preview";
import { readMarketMemoryRecord } from "@/lib/globe/market/market-intent-detail";

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
  trace: MarketCompletionTraceDraft | null;
  product: {
    title: string;
    priceLine: string;
    category: string;
    placeLabel: string;
    listingEventId: string;
    photoCount: number;
    photoUrls: string[];
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
}): MarketHandshakeRoomPayload {
  const { handshake, listingIntent, viewerUserId } = input;
  const seekingIntent = input.seekingIntent ?? null;
  const priceLine = formatPriceLine(listingIntent.priceMinKrw, listingIntent.priceMaxKrw);

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
    trace,
    product: {
      title: listingIntent.detail.productName || listingIntent.title,
      priceLine,
      category: marketCategoryLabelKo(listingIntent.categoryId),
      placeLabel: formatMarketPlaceLabel(listingIntent.placeLabel) || "근처",
      listingEventId: listingIntent.eventId,
      photoCount: listingIntent.detail.photoCount,
      photoUrls: listingIntent.detail.photoUrls ?? [],
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
