import { haversineKm } from "@/lib/feed/spacetime-fit";
import type {
  ContextLodgingInventoryRow,
  LodgingPhotoConfidence,
  LodgingPhotoSource,
} from "@/lib/globe/context-hub/lodging-resource-types";
import {
  filterTrustedVenueMediaUrls,
  isTrustedVenueMediaUrl,
} from "@/lib/globe/venue-media-fidelity";

export {
  filterTrustedVenueMediaUrls,
  isTrustedVenueMediaUrl,
} from "@/lib/globe/venue-media-fidelity";

type GoogleLodgingPhotoSeed = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  address?: string | null;
  mapsUrl?: string | null;
  nearbyPhotoUrls?: readonly string[];
};

type GoogleLodgingPhotoDetails = {
  placeId?: string | null;
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  mapsUrl?: string | null;
  photoUrls?: readonly string[];
};

export type ResolvedLodgingPhotoBundle = {
  images: string[];
  address: string | null;
  mapsUrl: string | null;
  photoSource: LodgingPhotoSource | null;
  photoConfidence: LodgingPhotoConfidence | null;
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, "");
}

function hasTokenOverlap(left: string | null | undefined, right: string | null | undefined): boolean {
  const leftToken = normalizeToken(left ?? "");
  const rightToken = normalizeToken(right ?? "");
  if (!leftToken || !rightToken) {
    return false;
  }
  return leftToken === rightToken || leftToken.includes(rightToken) || rightToken.includes(leftToken);
}

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

export function scoreGoogleLodgingIdentityMatch(input: {
  nearby: GoogleLodgingPhotoSeed;
  details: GoogleLodgingPhotoDetails;
}) {
  const exactPlaceId =
    Boolean(input.details.placeId?.trim()) &&
    input.details.placeId?.trim() === input.nearby.placeId;
  const nameMatch = hasTokenOverlap(input.nearby.name, input.details.name);
  const addressMatch = hasTokenOverlap(input.nearby.address, input.details.address);
  const distanceM =
    typeof input.details.lat === "number" &&
    Number.isFinite(input.details.lat) &&
    typeof input.details.lng === "number" &&
    Number.isFinite(input.details.lng)
      ? haversineKm(input.nearby.lat, input.nearby.lng, input.details.lat, input.details.lng) * 1000
      : null;

  let score = 0;
  if (exactPlaceId) {
    score += 7;
  }
  if (nameMatch) {
    score += 2;
  }
  if (addressMatch) {
    score += 2;
  }
  if (distanceM != null) {
    if (distanceM <= 120) {
      score += 3;
    } else if (distanceM <= 280) {
      score += 2;
    } else if (distanceM <= 600) {
      score += 1;
    } else {
      score -= 3;
    }
  }

  return {
    exactPlaceId,
    nameMatch,
    addressMatch,
    distanceM,
    score,
  };
}

export function resolveGoogleLodgingPhotoBundle(input: {
  nearby: GoogleLodgingPhotoSeed;
  details?: GoogleLodgingPhotoDetails | null;
}): ResolvedLodgingPhotoBundle {
  const nearbyImages = cleanUrls(input.nearby.nearbyPhotoUrls);
  const details = input.details ?? null;
  const detailImages = cleanUrls(details?.photoUrls);

  const identity = details
    ? scoreGoogleLodgingIdentityMatch({
        nearby: input.nearby,
        details,
      })
    : null;

  const detailVerified = Boolean(
    details &&
      detailImages.length > 0 &&
      identity &&
      ((identity.exactPlaceId && (identity.distanceM == null || identity.distanceM <= 600)) ||
        identity.score >= 8),
  );

  if (detailVerified) {
    return {
      images: filterTrustedVenueMediaUrls([...detailImages, ...nearbyImages]),
      address: details?.address?.trim() || input.nearby.address?.trim() || null,
      mapsUrl: details?.mapsUrl?.trim() || input.nearby.mapsUrl?.trim() || null,
      photoSource: "google_places_details",
      photoConfidence: identity?.exactPlaceId ? "exact_place_id" : "strong_identity",
    };
  }

  if (nearbyImages.length > 0) {
    return {
      images: filterTrustedVenueMediaUrls(nearbyImages),
      address: input.nearby.address?.trim() || details?.address?.trim() || null,
      mapsUrl: details?.mapsUrl?.trim() || input.nearby.mapsUrl?.trim() || null,
      photoSource: "google_places_nearby",
      photoConfidence: "nearby_identity",
    };
  }

  return {
    images: [],
    address: details?.address?.trim() || input.nearby.address?.trim() || null,
    mapsUrl: details?.mapsUrl?.trim() || input.nearby.mapsUrl?.trim() || null,
    photoSource: null,
    photoConfidence: null,
  };
}

export function selectPreferredLodgingImage(
  row: Pick<ContextLodgingInventoryRow, "images" | "provider" | "photoConfidence">,
): string | null {
  // Mock inventory is name/coord scaffolding only — never show stock heroes.
  if (row.provider === "mock" || row.photoConfidence === "mock") {
    return null;
  }

  const images = filterTrustedVenueMediaUrls(row.images);
  if (images.length === 0) {
    return null;
  }

  if (row.provider === "google_places") {
    return row.photoConfidence ? (images[0] ?? null) : null;
  }

  return images[0] ?? null;
}

/** Focus / hero slides — trusted photos only; drop demo tour clips. */
export function selectTrustedLodgingMediaSlides(
  payload: Pick<
    ContextLodgingInventoryRow,
    "images" | "videoUrl" | "provider" | "photoConfidence"
  >,
): readonly string[] {
  if (payload.provider === "mock" || payload.photoConfidence === "mock") {
    return [];
  }
  const slides: string[] = [];
  const video = payload.videoUrl?.trim();
  if (video && isTrustedVenueMediaUrl(video)) {
    slides.push(video);
  }
  slides.push(...filterTrustedVenueMediaUrls(payload.images));
  return slides;
}

function isMockLodgingMediaRow(
  row: Pick<
    ContextLodgingInventoryRow,
    "provider" | "photoConfidence" | "photoSource"
  >,
): boolean {
  return (
    row.provider === "mock" ||
    row.photoConfidence === "mock" ||
    row.photoSource === "mock"
  );
}

/**
 * World-wide policy (KR · JP · SEA · HK · TW · rest):
 * mock scaffolding never keeps Unsplash/demo media; live rows keep provider photos only.
 */
export function sanitizeLodgingInventoryRowMedia<
  T extends Pick<
    ContextLodgingInventoryRow,
    | "images"
    | "videoUrl"
    | "provider"
    | "photoConfidence"
    | "photoSource"
    | "roomOffers"
  >,
>(row: T): T {
  if (isMockLodgingMediaRow(row)) {
    return {
      ...row,
      images: [],
      videoUrl: null,
      roomOffers: row.roomOffers?.map((offer) => ({
        ...offer,
        imageUrls: [],
      })),
    };
  }

  const images = filterTrustedVenueMediaUrls(row.images);
  const videoUrl =
    row.videoUrl && isTrustedVenueMediaUrl(row.videoUrl)
      ? row.videoUrl.trim()
      : null;
  const roomOffers = row.roomOffers?.map((offer) => ({
    ...offer,
    imageUrls: filterTrustedVenueMediaUrls(offer.imageUrls),
  }));

  return {
    ...row,
    images,
    videoUrl,
    roomOffers,
  };
}

export function sanitizeLodgingInventoryRows(
  rows: readonly ContextLodgingInventoryRow[],
): ContextLodgingInventoryRow[] {
  return rows.map(sanitizeLodgingInventoryRowMedia);
}
