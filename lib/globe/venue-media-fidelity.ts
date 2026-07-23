/**
 * Venue media policy — lodging · eatery · amenity · activity · pharmacy · convenience.
 * Only Google Places / LiteAPI / other listing-provider photos. Never Unsplash,
 * Naver Image Search, Google CSE, or sample demo clips.
 */

import type { ContextPlaceInventoryRow } from "@/lib/globe/place/place-resource-types";

function cleanUrls(urls: readonly string[] | null | undefined): string[] {
  const next: string[] = [];
  for (const url of urls ?? []) {
    const trimmed = url.trim();
    if (trimmed && !next.includes(trimmed)) {
      next.push(trimmed);
    }
  }
  return next;
}

/** Stock / web-scrape / demo hosts that must never paint as a named venue. */
const UNTRUSTED_VENUE_MEDIA_HOST =
  /(?:^|\.)(?:unsplash\.com|images\.unsplash\.com|plus\.unsplash\.com|picsum\.photos|placekitten\.com|placehold\.co|placeholder\.com|pexels\.com|images\.pexels\.com|commondatastorage\.googleapis\.com|pstatic\.net|shop\.pstatic\.net|blogfiles\.pstatic\.net|postfiles\.pstatic\.net|search\.pstatic\.net|encrypted-tbn0\.gstatic\.com|encrypted-tbn1\.gstatic\.com|encrypted-tbn2\.gstatic\.com|encrypted-tbn3\.gstatic\.com)$/iu;

const UNTRUSTED_VENUE_MEDIA_PATH =
  /\/gtv-videos-bucket\/|\/images\?q=|\/thumbnails\?|blogthumb|shoppingsearch/iu;

/**
 * True for media that can belong to a real listing (Places photo API / LiteAPI CDN).
 * Rejects Unsplash, Pexels, Naver Image CDN, CSE thumbnails, Google sample MP4s.
 */
export function isTrustedVenueMediaUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim();
  if (!trimmed) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (UNTRUSTED_VENUE_MEDIA_HOST.test(host)) {
      return false;
    }
    if (UNTRUSTED_VENUE_MEDIA_PATH.test(`${parsed.pathname}${parsed.search}`)) {
      return false;
    }
    if (host === "commondatastorage.googleapis.com") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function filterTrustedVenueMediaUrls(
  urls: readonly string[] | null | undefined,
): string[] {
  return cleanUrls(urls).filter(isTrustedVenueMediaUrl);
}

export function isMockOrSeedPlaceId(placeId: string | null | undefined): boolean {
  const id = placeId?.trim() ?? "";
  if (!id) {
    return false;
  }
  return (
    id.startsWith("mock-") ||
    id.startsWith("seed:") ||
    id.startsWith("seed-") ||
    id.startsWith("gcmd:seed") ||
    id.startsWith("world-geo:") ||
    id.startsWith("osaka-demo:")
  );
}

export function sanitizePlaceInventoryRow(
  row: ContextPlaceInventoryRow,
): ContextPlaceInventoryRow {
  const isMock =
    row.provider === "mock" || isMockOrSeedPlaceId(row.placeId);
  if (isMock) {
    return {
      ...row,
      images: [],
      provider: row.provider ?? "mock",
    };
  }
  return {
    ...row,
    images: filterTrustedVenueMediaUrls(row.images),
  };
}

export function sanitizePlaceInventoryRows(
  rows: readonly ContextPlaceInventoryRow[],
): ContextPlaceInventoryRow[] {
  return rows.map(sanitizePlaceInventoryRow);
}

/** Keep provider photos only — never invent web-search heroes. */
export function keepProviderPlacePhotos(input: {
  thumbnailUrl?: string | null;
  photoUrls?: readonly string[] | null;
  placeId?: string | null;
  provider?: string | null;
}): { thumbnail_url: string | null; photo_urls: string[] } {
  if (
    input.provider === "mock" ||
    isMockOrSeedPlaceId(input.placeId)
  ) {
    return { thumbnail_url: null, photo_urls: [] };
  }
  const photo_urls = filterTrustedVenueMediaUrls(input.photoUrls);
  const thumb = input.thumbnailUrl?.trim() ?? null;
  const thumbnail_url =
    thumb && isTrustedVenueMediaUrl(thumb)
      ? thumb
      : photo_urls[0] ?? null;
  return { thumbnail_url, photo_urls };
}
