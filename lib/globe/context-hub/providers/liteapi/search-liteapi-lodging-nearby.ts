import {
  liteApiRatesUrl,
  readLiteApiDisplayCurrency,
  readLiteApiGuestNationality,
  readLiteApiMarginPercent,
  readLiteApiSearchRadiusM,
} from "@/lib/globe/context-hub/providers/liteapi/liteapi-config";
import { liteApiFetch } from "@/lib/globe/context-hub/providers/liteapi/liteapi-http";
import { fetchLiteApiHotelDetailsBundles } from "@/lib/globe/context-hub/providers/liteapi/fetch-liteapi-hotel-images";
import {
  LITEAPI_MAX_ROOM_OFFERS_PER_HOTEL,
  mapLiteApiRatesToInventory,
} from "@/lib/globe/context-hub/providers/liteapi/map-liteapi-rates-to-inventory";
import type { LiteApiRatesResponse } from "@/lib/globe/context-hub/providers/liteapi/liteapi-types";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";

function ymdFromIso(iso: string | null | undefined): string | null {
  if (!iso?.trim()) {
    return null;
  }
  const date = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function defaultStayDates(): { checkIn: string; checkOut: string } {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 7);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 1);
  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
  };
}

/** Live hotel inventory via Nuitee Connect — POST /hotels/rates (lat/lng radius). */
export async function searchLiteApiLodgingNearby(input: {
  lat: number;
  lng: number;
  maxResults?: number;
  checkInIso?: string | null;
  checkOutIso?: string | null;
  guestCount?: number;
  roomCount?: number;
}): Promise<ContextLodgingInventoryRow[]> {
  const defaults = defaultStayDates();
  const checkin = ymdFromIso(input.checkInIso) ?? defaults.checkIn;
  const checkout = ymdFromIso(input.checkOutIso) ?? defaults.checkOut;
  const guestCount = Math.max(1, Math.round(input.guestCount ?? 2));
  const roomCount = Math.max(1, Math.round(input.roomCount ?? 1));
  const margin = readLiteApiMarginPercent();

  const body: Record<string, unknown> = {
    checkin,
    checkout,
    currency: readLiteApiDisplayCurrency(),
    guestNationality: readLiteApiGuestNationality(),
    occupancies: [{ adults: guestCount, children: [] }],
    latitude: input.lat,
    longitude: input.lng,
    radius: readLiteApiSearchRadiusM(),
    maxRatesPerHotel: LITEAPI_MAX_ROOM_OFFERS_PER_HOTEL,
    includeHotelData: true,
    roomMapping: true,
  };
  if (margin != null) {
    body.margin = margin;
  }

  const response = await liteApiFetch<LiteApiRatesResponse>({
    url: liteApiRatesUrl("/hotels/rates"),
    method: "POST",
    body,
  });

  if (!response.ok) {
    return [];
  }

  const hotelRates = response.data.data ?? [];
  const hotels = response.data.hotels ?? [];
  if (hotelRates.length === 0) {
    return [];
  }

  const fallbackById: Record<string, string | null> = {};
  for (const hotel of hotels) {
    const id = hotel.id?.trim();
    if (!id) {
      continue;
    }
    fallbackById[id] = hotel.main_photo?.trim() || hotel.thumbnail?.trim() || null;
  }

  const hotelIds = hotelRates
    .map((row) => row.hotelId?.trim())
    .filter((id): id is string => Boolean(id));
  const detailsBundles = await fetchLiteApiHotelDetailsBundles(hotelIds, fallbackById);
  const imageMap = new Map<string, string[]>();
  for (const [hotelId, bundle] of detailsBundles) {
    if (bundle.hotelImages.length > 0) {
      imageMap.set(hotelId, [...bundle.hotelImages]);
    }
  }

  return mapLiteApiRatesToInventory({
    hotelRates,
    hotels,
    guestCount,
    roomCount,
    checkInIso: `${checkin}T15:00:00.000Z`,
    checkOutIso: `${checkout}T11:00:00.000Z`,
    maxHotels: input.maxResults ?? 8,
    imageMap,
    detailsBundles,
  });
}
