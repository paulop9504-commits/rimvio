/**
 * Attach LiteAPI offer to lodging prep when API key is configured.
 * Prefers offer already stamped on the graph node from live search.
 */

import { searchLiteApiLodgingNearby } from "@/lib/globe/context-hub/providers/liteapi/search-liteapi-lodging-nearby";
import { isLiteApiConfigured } from "@/lib/globe/context-hub/providers/liteapi/liteapi-config";

export type LodgingOfferAttach = {
  readonly liteapiOfferId: string | null;
  readonly providerLabelKo: string | null;
  readonly amountLabel: string | null;
};

function normalizeHotelLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s&·\-_/(),.［］[\]『』「」""'']/gu, "");
}

export async function resolveLodgingLiteApiOfferForPrep(input: {
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly guestCount?: number;
  readonly checkInIso?: string | null;
  readonly checkOutIso?: string | null;
  readonly hotelLabelKo?: string | null;
  readonly liteapiHotelId?: string | null;
  readonly existingOfferId?: string | null;
  readonly existingAmountLabel?: string | null;
}): Promise<LodgingOfferAttach> {
  if (input.existingOfferId?.trim()) {
    return {
      liteapiOfferId: input.existingOfferId.trim(),
      providerLabelKo: "LiteAPI",
      amountLabel: input.existingAmountLabel?.trim() || null,
    };
  }

  if (!isLiteApiConfigured()) {
    return { liteapiOfferId: null, providerLabelKo: null, amountLabel: null };
  }
  const lat = input.lat;
  const lng = input.lng;
  if (lat == null || lng == null) {
    return { liteapiOfferId: null, providerLabelKo: null, amountLabel: null };
  }

  const rows = await searchLiteApiLodgingNearby({
    lat,
    lng,
    maxResults: 8,
    guestCount: input.guestCount ?? 2,
    checkInIso: input.checkInIso,
    checkOutIso: input.checkOutIso,
  });
  if (rows.length === 0) {
    return { liteapiOfferId: null, providerLabelKo: null, amountLabel: null };
  }

  const hotelId = input.liteapiHotelId?.trim() || null;
  const labelNeedle = input.hotelLabelKo
    ? normalizeHotelLabel(input.hotelLabelKo)
    : "";

  const matched =
    (hotelId
      ? rows.find(
          (row) =>
            row.liteapiHotelId === hotelId ||
            row.placeId === `liteapi:${hotelId}` ||
            row.placeId.endsWith(hotelId),
        )
      : null) ??
    (labelNeedle.length >= 2
      ? rows.find((row) => {
          const hay = normalizeHotelLabel(row.name);
          return hay.includes(labelNeedle) || labelNeedle.includes(hay);
        })
      : null) ??
    rows[0];

  const offer = matched?.roomOffers?.[0];
  if (!offer?.providerOfferId?.trim()) {
    return { liteapiOfferId: null, providerLabelKo: null, amountLabel: null };
  }

  const amount =
    offer.totalPriceKrw != null && Number.isFinite(offer.totalPriceKrw)
      ? `${offer.totalPriceKrw.toLocaleString("ko-KR")}원`
      : null;

  return {
    liteapiOfferId: offer.providerOfferId.trim(),
    providerLabelKo: "LiteAPI",
    amountLabel: amount,
  };
}
