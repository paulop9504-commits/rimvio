import { copy } from "@/lib/copy/human-ko";
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
}): MarketCompletionTraceDraft {
  const place = input.placeLabel.trim() || "근처";
  const title =
    input.viewerRole === "seeking"
      ? copy.globe.marketCompletionTraceTitleSeeking(input.productName, input.priceLine, place)
      : copy.globe.marketCompletionTraceTitleListing(input.productName, input.priceLine, place);

  return {
    handshakeId: input.handshake.id,
    eventId: marketCompletionEventId(input.handshake.id, input.viewerUserId),
    title,
    placeLabel: place,
    lat: input.lat,
    lng: input.lng,
    priceLine: input.priceLine,
    role: input.viewerRole,
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
