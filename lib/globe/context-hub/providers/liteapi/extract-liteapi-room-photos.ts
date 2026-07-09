import type {
  LiteApiCaptionPhotoEntry,
  LiteApiHotelDetailsData,
  LiteApiHotelDetailsBundle,
  LiteApiHotelImage,
  LiteApiRoomPhoto,
  LiteApiRoomPhotoCatalogEntry,
} from "@/lib/globe/context-hub/providers/liteapi/liteapi-hotel-details-types";

const MAX_HOTEL_IMAGES = 12;
const MAX_ROOM_IMAGES = 3;

function normalizeUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function readRoomPhotoUrl(photo: LiteApiRoomPhoto): string | null {
  return (
    normalizeUrl(photo.hd_url) ??
    normalizeUrl(photo.url) ??
    normalizeUrl(photo.failoverPhoto)
  );
}

export function extractLiteApiRoomPhotoUrls(
  photos: readonly LiteApiRoomPhoto[] | null | undefined,
  max = MAX_ROOM_IMAGES,
): string[] {
  if (!photos?.length) {
    return [];
  }
  const sorted = [...photos].sort((a, b) => {
    if (a.mainPhoto && !b.mainPhoto) {
      return -1;
    }
    if (!a.mainPhoto && b.mainPhoto) {
      return 1;
    }
    return (b.score ?? 0) - (a.score ?? 0);
  });
  const urls: string[] = [];
  for (const photo of sorted) {
    const url = readRoomPhotoUrl(photo);
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
    if (urls.length >= max) {
      break;
    }
  }
  return urls;
}

function cleanHotelImageUrls(images: readonly LiteApiHotelImage[]): string[] {
  const urls: string[] = [];
  const sorted = [...images].sort((a, b) => {
    if (a.defaultImage && !b.defaultImage) {
      return -1;
    }
    if (!a.defaultImage && b.defaultImage) {
      return 1;
    }
    return (a.order ?? 999) - (b.order ?? 999);
  });
  for (const image of sorted) {
    const url = normalizeUrl(image.url) ?? normalizeUrl(image.thumbnailUrl);
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
    if (urls.length >= MAX_HOTEL_IMAGES) {
      break;
    }
  }
  return urls;
}

export function extractLiteApiHotelImageUrls(
  details: LiteApiHotelDetailsData | null | undefined,
  fallback?: string | null,
): string[] {
  const fromGallery = cleanHotelImageUrls(details?.hotelImages ?? []);
  if (fromGallery.length > 0) {
    return fromGallery;
  }
  const single =
    normalizeUrl(details?.main_photo) ??
    normalizeUrl(details?.thumbnail) ??
    normalizeUrl(fallback);
  return single ? [single] : [];
}

export function buildLiteApiHotelDetailsBundle(input: {
  details: LiteApiHotelDetailsData | null | undefined;
  fallback?: string | null;
}): LiteApiHotelDetailsBundle {
  const roomPhotosByMappedId = new Map<string, string[]>();
  const roomCatalog: LiteApiRoomPhotoCatalogEntry[] = [];
  for (const room of input.details?.rooms ?? []) {
    const mappedId = resolveLiteApiMappedRoomId(room.id);
    const urls = extractLiteApiRoomPhotoUrls(room.photos);
    if (urls.length === 0) {
      continue;
    }
    if (mappedId) {
      roomPhotosByMappedId.set(mappedId, urls);
    }
    roomCatalog.push({
      mappedRoomId: mappedId,
      roomName: room.roomName?.trim() || "",
      imageUrls: urls,
    });
  }

  const captionPhotoIndex: LiteApiCaptionPhotoEntry[] = [];
  for (const image of input.details?.hotelImages ?? []) {
    const caption = image.caption?.trim();
    const url = normalizeUrl(image.url) ?? normalizeUrl(image.thumbnailUrl);
    if (caption && url && caption.length >= 4) {
      captionPhotoIndex.push({ caption, url });
    }
  }

  return {
    hotelImages: extractLiteApiHotelImageUrls(input.details, input.fallback),
    roomPhotosByMappedId,
    roomCatalog,
    captionPhotoIndex,
  };
}

export function resolveLiteApiMappedRoomId(
  value: number | string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed || null;
}
