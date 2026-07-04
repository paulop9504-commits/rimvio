import { copy } from "@/lib/copy/human-ko";
import type { NegotiationTraceContext } from "@/lib/globe/market/build-negotiation-trace-context";
import type {
  MarketCompletionTraceDraft,
  MarketHandshakeRecord,
} from "@/lib/globe/market/market-handshake-types";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";

export function marketCompletionEventId(handshakeId: string, userId: string): string {
  const userSuffix = userId.replace(/-/g, "").slice(0, 8);
  return `mc-${handshakeId.replace(/-/g, "").slice(0, 12)}-${userSuffix}`;
}

export function buildMarketCompletionTraceDraft(input: {
  handshake: MarketHandshakeRecord;
  viewerRole: MarketIntentRole;
  viewerUserId: string;
  productName: string;
  priceLine: string;
  placeLabel: string;
  lat: number;
  lng: number;
  negotiation?: NegotiationTraceContext | null;
}): MarketCompletionTraceDraft {
  const place = input.placeLabel.trim() || "근처";
  const priceLine = input.negotiation?.priceLine?.trim() || input.priceLine;
  const title =
    input.viewerRole === "seeking"
      ? copy.globe.marketCompletionTraceTitleSeeking(input.productName, priceLine, place)
      : copy.globe.marketCompletionTraceTitleListing(input.productName, priceLine, place);

  return {
    handshakeId: input.handshake.id,
    seekingUserId: input.handshake.seekingUserId,
    listingUserId: input.handshake.listingUserId,
    eventId: marketCompletionEventId(input.handshake.id, input.viewerUserId),
    title,
    placeLabel: place,
    lat: input.lat,
    lng: input.lng,
    priceLine,
    role: input.viewerRole,
    atIso: input.handshake.completedAtIso,
    productName: input.negotiation?.productName ?? input.productName,
    realizedPriceKrw:
      input.negotiation?.realizedPriceKrw ?? input.handshake.realizedPriceKrw,
    negotiationSummaryKo: input.negotiation?.negotiationSummaryKo,
    coordinationLogSummary: input.negotiation?.coordinationLogSummary,
    proposal: input.negotiation?.proposal ?? null,
    filledSlots: input.negotiation?.filledSlots ?? {},
  };
}

export function resolveRealizedPriceKrw(
  listingPriceMin: number | null,
  listingPriceMax: number | null,
): number | null {
  if (listingPriceMin !== null && listingPriceMax !== null && listingPriceMin === listingPriceMax) {
    return listingPriceMin;
  }
  if (listingPriceMax !== null) {
    return listingPriceMax;
  }
  if (listingPriceMin !== null) {
    return listingPriceMin;
  }
  return null;
}
