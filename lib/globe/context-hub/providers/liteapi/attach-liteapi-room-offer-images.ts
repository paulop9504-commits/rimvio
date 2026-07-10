import type { LodgingRoomOffer } from "@/lib/globe/context-hub/lodging-resource-types";
import type { LiteApiHotelDetailsBundle } from "@/lib/globe/context-hub/providers/liteapi/liteapi-hotel-details-types";
import {
  findBestRoomCatalogMatch,
  findCaptionPhotoMatches,
} from "@/lib/globe/context-hub/providers/liteapi/match-liteapi-room-photos";

function resolveOfferRoomImageUrls(input: {
  offer: LodgingRoomOffer;
  detailsBundle?: LiteApiHotelDetailsBundle | null;
  roomPhotosByMappedId?: ReadonlyMap<string, readonly string[]> | null;
}): readonly string[] | undefined {
  if (input.offer.imageUrls?.length) {
    return input.offer.imageUrls;
  }

  const mappedRoomId = input.offer.mappedRoomId?.trim();
  const mappedSources = [
    input.roomPhotosByMappedId,
    input.detailsBundle?.roomPhotosByMappedId,
  ];
  if (mappedRoomId) {
    for (const source of mappedSources) {
      const imageUrls = source?.get(mappedRoomId);
      if (imageUrls?.length) {
        return imageUrls;
      }
    }
  }

  const catalog = input.detailsBundle?.roomCatalog;
  if (catalog?.length) {
    const matched = findBestRoomCatalogMatch(input.offer.title, catalog);
    if (matched?.imageUrls.length) {
      return matched.imageUrls;
    }
  }

  const captionIndex = input.detailsBundle?.captionPhotoIndex;
  if (captionIndex?.length) {
    const captionUrls = findCaptionPhotoMatches(input.offer.title, captionIndex);
    if (captionUrls.length > 0) {
      return captionUrls;
    }
  }

  return undefined;
}

/** Attach room gallery URLs — mappedRoomId first, then fuzzy room/caption match. */
export function attachLiteApiRoomOfferImages(input: {
  offers: readonly LodgingRoomOffer[];
  detailsBundle?: LiteApiHotelDetailsBundle | null;
  /** Legacy — prefer detailsBundle */
  roomPhotosByMappedId?: ReadonlyMap<string, readonly string[]> | null;
}): LodgingRoomOffer[] {
  return input.offers.map((offer) => {
    const imageUrls = resolveOfferRoomImageUrls({
      offer,
      detailsBundle: input.detailsBundle,
      roomPhotosByMappedId: input.roomPhotosByMappedId,
    });
    if (!imageUrls?.length) {
      return offer;
    }
    return {
      ...offer,
      imageUrls,
    };
  });
}

export function resolveLodgingOfferCoverUrl(input: {
  offer: Pick<LodgingRoomOffer, "imageUrls">;
  propertyImages?: readonly string[] | null;
}): string | null {
  const roomCover = input.offer.imageUrls?.[0]?.trim();
  if (roomCover) {
    return roomCover;
  }
  return input.propertyImages?.[0]?.trim() ?? null;
}
