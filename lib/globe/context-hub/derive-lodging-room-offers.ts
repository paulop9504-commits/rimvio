import type {
  ContextLodgingInventoryRow,
  LodgingRoomOffer,
  LodgingStayWindow,
} from "@/lib/globe/context-hub/lodging-resource-types";
import { copy } from "@/lib/copy/human-ko";

function computeNights(stayWindow: LodgingStayWindow | null | undefined): number {
  if (typeof stayWindow?.nights === "number" && stayWindow.nights > 0) {
    return stayWindow.nights;
  }
  return 1;
}

function totalPrice(priceKrw: number | null | undefined, nights: number): number | null {
  if (priceKrw == null || !Number.isFinite(priceKrw)) {
    return null;
  }
  return Math.round(priceKrw * Math.max(1, nights));
}

/**
 * Dev/mock only — estimated room cards when no provider rate inventory exists.
 * Never used for LiteAPI (live rates) or Google Places (no rate API).
 */
export function deriveLodgingRoomOffers(input: {
  row: Pick<
    ContextLodgingInventoryRow,
    "priceKrw" | "partnerLabel" | "stayWindow" | "provider"
  >;
  guestCount: number;
  roomCount: number;
}): readonly LodgingRoomOffer[] {
  if (input.row.provider === "liteapi" || input.row.provider === "google_places") {
    return [];
  }

  const guestCount = Math.max(1, Math.round(input.guestCount));
  const roomCount = Math.max(1, Math.round(input.roomCount));
  const nights = computeNights(input.row.stayWindow);
  const basePrice = input.row.priceKrw ?? null;
  const sourceLabelKo = copy.globe.lodgingRoomCardEstimateSource;
  const multipliers = [1, 1.08, 0.93];

  return multipliers.map((multiplier, index) => {
    const scaled =
      basePrice == null ? null : Math.round(basePrice * multiplier);
    const perNight = scaled;
    const stayTotal = totalPrice(scaled, nights);
    return {
      id: `derived-room-${index + 1}`,
      title: copy.globe.lodgingRoomCardEstimateOption(index + 1),
      occupancyLabelKo: `성인 ${guestCount}명 · 객실 ${roomCount}개`,
      priceKrw: perNight,
      totalPriceKrw: stayTotal,
      refundable: index !== 2,
      roomCount,
      guestCount,
      sourceLabelKo,
    };
  });
}

/** Prefer live LiteAPI rates; derive only for mock/dev when rates are absent. */
export function resolveLodgingRoomOffers(input: {
  row: ContextLodgingInventoryRow;
  guestCount: number;
  roomCount: number;
  stayWindow?: LodgingStayWindow | null;
}): readonly LodgingRoomOffer[] {
  if (input.row.roomOffers && input.row.roomOffers.length > 0) {
    return input.row.roomOffers;
  }
  return deriveLodgingRoomOffers({
    row: {
      ...input.row,
      stayWindow: input.stayWindow ?? input.row.stayWindow ?? null,
      provider: input.row.provider ?? null,
    },
    guestCount: input.guestCount,
    roomCount: input.roomCount,
  });
}
