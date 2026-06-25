export const MARKET_LISTING_MEDIA_ACCEPT = "image/*,video/*";

export const MARKET_LISTING_MAX_PHOTOS = 3;
export const MARKET_LISTING_MAX_VIDEOS = 1;

/** Relaxed vs generic bridge ingest — listing explain clips from phone gallery. */
export const MARKET_LISTING_PHOTO_MAX_BYTES = 24 * 1024 * 1024;
export const MARKET_LISTING_VIDEO_MAX_BYTES = 150 * 1024 * 1024;
/** Seller product explanation clip — trimmed on upload. */
export const MARKET_LISTING_VIDEO_MAX_DURATION_SEC = 30;

export function assertMarketListingMediaSize(input: {
  byteLength: number;
  contentType: string;
}): void {
  const type = input.contentType.trim().toLowerCase();
  if (type.startsWith("image/")) {
    if (input.byteLength > MARKET_LISTING_PHOTO_MAX_BYTES) {
      throw new Error("사진 용량이 커요");
    }
    return;
  }
  if (type.startsWith("video/")) {
    if (input.byteLength > MARKET_LISTING_VIDEO_MAX_BYTES) {
      throw new Error("동영상 용량이 커요");
    }
    return;
  }
  throw new Error("지원하지 않는 형식이에요");
}

export function validateMarketListingMediaPick(files: readonly File[]): {
  accepted: File[];
  rejectedSize: number;
} {
  const accepted: File[] = [];
  let rejectedSize = 0;
  for (const file of files) {
    if (!isMarketListingMediaFile(file)) {
      continue;
    }
    try {
      assertMarketListingMediaSize({
        byteLength: file.size,
        contentType: file.type || (isMarketListingVideoFile(file) ? "video/mp4" : "image/jpeg"),
      });
      accepted.push(file);
    } catch {
      rejectedSize += 1;
    }
  }
  return { accepted, rejectedSize };
}

export function isMarketListingPhotoFile(file: File): boolean {
  return file.type.trim().toLowerCase().startsWith("image/");
}

export function isMarketListingVideoFile(file: File): boolean {
  return file.type.trim().toLowerCase().startsWith("video/");
}

export function isMarketListingMediaFile(file: File): boolean {
  return isMarketListingPhotoFile(file) || isMarketListingVideoFile(file);
}

/** Merge incoming picks — up to 3 photos + 1 video; videos first for preview order. */
export function mergeMarketListingMediaFiles(
  existing: readonly File[],
  incoming: readonly File[],
): File[] {
  const photos = existing.filter(isMarketListingPhotoFile);
  const videos = existing.filter(isMarketListingVideoFile);

  for (const file of incoming) {
    if (isMarketListingPhotoFile(file) && photos.length < MARKET_LISTING_MAX_PHOTOS) {
      photos.push(file);
      continue;
    }
    if (isMarketListingVideoFile(file) && videos.length < MARKET_LISTING_MAX_VIDEOS) {
      videos.push(file);
    }
  }

  return [...videos, ...photos];
}

export function countMarketListingMedia(files: readonly File[]): {
  photoCount: number;
  videoCount: number;
} {
  let photoCount = 0;
  let videoCount = 0;
  for (const file of files) {
    if (isMarketListingPhotoFile(file)) {
      photoCount += 1;
    } else if (isMarketListingVideoFile(file)) {
      videoCount += 1;
    }
  }
  return { photoCount, videoCount };
}

export type MarketListingMediaItem = {
  kind: "photo" | "video";
  url: string;
};

export function buildMarketListingMediaItems(detail: {
  photoUrls?: string[];
  videoUrls?: string[];
}): MarketListingMediaItem[] {
  const items: MarketListingMediaItem[] = [];
  for (const url of detail.videoUrls ?? []) {
    const trimmed = url.trim();
    if (trimmed) {
      items.push({ kind: "video", url: trimmed });
    }
  }
  for (const url of detail.photoUrls ?? []) {
    const trimmed = url.trim();
    if (trimmed) {
      items.push({ kind: "photo", url: trimmed });
    }
  }
  return items;
}
