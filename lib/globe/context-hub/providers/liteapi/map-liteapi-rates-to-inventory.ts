import type {
  ContextLodgingInventoryRow,
  LodgingRoomOffer,
} from "@/lib/globe/context-hub/lodging-resource-types";
import { attachLiteApiRoomOfferImages } from "@/lib/globe/context-hub/providers/liteapi/attach-liteapi-room-offer-images";
import type { LiteApiHotelDetailsBundle } from "@/lib/globe/context-hub/providers/liteapi/liteapi-hotel-details-types";
import { resolveLiteApiMappedRoomId } from "@/lib/globe/context-hub/providers/liteapi/extract-liteapi-room-photos";
import type {
  LiteApiHotelCard,
  LiteApiHotelRate,
  LiteApiRateRow,
  LiteApiRoomType,
} from "@/lib/globe/context-hub/providers/liteapi/liteapi-types";

const USD_TO_KRW = 1_400;

function toKrwAmount(amount: number | undefined, currency: string | undefined): number | null {
  if (amount == null || !Number.isFinite(amount)) {
    return null;
  }
  const code = currency?.trim().toUpperCase() ?? "KRW";
  if (code === "KRW") {
    return Math.round(amount);
  }
  if (code === "USD") {
    return Math.round(amount * USD_TO_KRW);
  }
  return Math.round(amount);
}

function readRateTotalKrw(rate: LiteApiRateRow): number | null {
  const total = rate.retailRate?.total?.[0];
  return toKrwAmount(total?.amount, total?.currency);
}

function isRefundable(rate: LiteApiRateRow): boolean {
  const tag = rate.cancellationPolicies?.refundableTag?.toLowerCase() ?? "";
  if (!tag) {
    return true;
  }
  return !tag.includes("non");
}

/** Max live rate cards per hotel — one card per LiteAPI rate row. */
export const LITEAPI_MAX_ROOM_OFFERS_PER_HOTEL = 8;

function buildRoomOffer(input: {
  hotelId: string;
  roomType: LiteApiRoomType;
  rate: LiteApiRateRow;
  guestCount: number;
  roomCount: number;
}): LodgingRoomOffer | null {
  const offerId = input.roomType.offerId?.trim();
  const rateId = input.rate.rateId?.trim();
  if (!offerId || !rateId) {
    return null;
  }
  const totalPriceKrw = readRateTotalKrw(input.rate);
  const title =
    input.rate.name?.trim() ||
    input.roomType.name?.trim() ||
    "객실";
  const board = input.rate.boardName?.trim();
  const mappedRoomId = resolveLiteApiMappedRoomId(input.rate.mappedRoomId);
  return {
    id: `liteapi-${input.hotelId}-${offerId}-${rateId}`,
    title: board ? `${title} · ${board}` : title,
    occupancyLabelKo: `성인 ${input.guestCount}명 · 객실 ${input.roomCount}개`,
    priceKrw: totalPriceKrw,
    totalPriceKrw,
    refundable: isRefundable(input.rate),
    roomCount: input.roomCount,
    guestCount: input.guestCount,
    sourceLabelKo: "Nuitee Connect",
    providerOfferId: offerId,
    providerRateId: rateId,
    mappedRoomId,
  };
}

function buildRoomOffersForHotel(input: {
  hotelRate: LiteApiHotelRate;
  guestCount: number;
  roomCount: number;
  maxOffers?: number;
}): LodgingRoomOffer[] {
  const offers: LodgingRoomOffer[] = [];
  for (const roomType of input.hotelRate.roomTypes ?? []) {
    for (const rate of roomType.rates ?? []) {
      const offer = buildRoomOffer({
        hotelId: input.hotelRate.hotelId,
        roomType,
        rate,
        guestCount: input.guestCount,
        roomCount: input.roomCount,
      });
      if (offer) {
        offers.push(offer);
      }
    }
  }
  const cap = input.maxOffers ?? LITEAPI_MAX_ROOM_OFFERS_PER_HOTEL;
  return [...offers]
    .sort((a, b) => {
      const aPrice = a.totalPriceKrw ?? Number.POSITIVE_INFINITY;
      const bPrice = b.totalPriceKrw ?? Number.POSITIVE_INFINITY;
      return aPrice - bPrice;
    })
    .slice(0, cap);
}

function liteApiPlaceId(hotelId: string): string {
  return `liteapi:${hotelId.trim()}`;
}

export function mapLiteApiRatesToInventory(input: {
  hotelRates: readonly LiteApiHotelRate[];
  hotels: readonly LiteApiHotelCard[];
  guestCount: number;
  roomCount: number;
  checkInIso: string;
  checkOutIso: string;
  maxHotels?: number;
  imageMap?: ReadonlyMap<string, readonly string[]>;
  detailsBundles?: ReadonlyMap<string, LiteApiHotelDetailsBundle>;
}): ContextLodgingInventoryRow[] {
  const hotelById = new Map(
    input.hotels.map((hotel) => [hotel.id, hotel] as const),
  );
  const rows: ContextLodgingInventoryRow[] = [];

  for (const hotelRate of input.hotelRates.slice(0, input.maxHotels ?? 8)) {
    const hotelId = hotelRate.hotelId?.trim();
    if (!hotelId) {
      continue;
    }
    const meta = hotelById.get(hotelId);
    const rawRoomOffers = buildRoomOffersForHotel({
      hotelRate,
      guestCount: input.guestCount,
      roomCount: input.roomCount,
      maxOffers: LITEAPI_MAX_ROOM_OFFERS_PER_HOTEL,
    });
    const detailsBundle = input.detailsBundles?.get(hotelId);
    const roomOffers = attachLiteApiRoomOfferImages({
      offers: rawRoomOffers,
      detailsBundle: detailsBundle ?? null,
    });
    if (roomOffers.length === 0) {
      continue;
    }

    const lat = meta?.latitude;
    const lng = meta?.longitude;
    if (
      lat == null ||
      lng == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      continue;
    }

    const thumb = meta?.main_photo?.trim() || meta?.thumbnail?.trim() || null;
    const gallery = input.imageMap?.get(hotelId) ?? [];
    const images =
      gallery.length > 0 ? [...gallery] : thumb ? [thumb] : [];
    const cheapest = roomOffers
      .map((offer) => offer.totalPriceKrw)
      .filter((value): value is number => value != null)
      .sort((a, b) => a - b)[0] ?? null;

    rows.push({
      placeId: liteApiPlaceId(hotelId),
      name: meta?.name?.trim() || hotelId,
      lat,
      lng,
      images,
      videoUrl: null,
      priceKrw: cheapest,
      partnerLabel: "Nuitee Connect",
      address: meta?.address?.trim() || null,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`,
      provider: "liteapi",
      photoSource: "liteapi",
      photoConfidence: "strong_identity",
      checkInIso: input.checkInIso,
      checkOutIso: input.checkOutIso,
      liteapiHotelId: hotelId,
      roomOffers,
      rating:
        typeof meta?.rating === "number" && Number.isFinite(meta.rating)
          ? meta.rating
          : typeof meta?.stars === "number" && Number.isFinite(meta.stars)
            ? meta.stars
            : null,
      reviewCount: null,
    });
  }

  return rows;
}
