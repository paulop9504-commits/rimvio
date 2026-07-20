import { capabilitiesForObjectType } from "@/lib/reality-object/capabilities-for-type";
import {
  detectRealityObjectType,
  type DetectRealityObjectTypeInput,
} from "@/lib/reality-object/detect-reality-object-type";
import type {
  RealityObjectOntology,
  RealityObjectType,
  RealityObjectV1,
  RealityPinCompatKind,
} from "@/lib/reality-object/types";
import { selectProjectionVisualUrl } from "@/lib/visual-projection/select-projection-visual";

export type BuildRealityObjectInput = {
  contextEventId: string;
  title: string;
  placeId: string;
  resourceId?: string | null;
  pinKind?: RealityPinCompatKind | null;
  /** Force object type (photo / video / reel ingress). */
  objectTypeOverride?: RealityObjectType | null;
  categoryLabel?: string | null;
  cuisineHint?: string | null;
  coverImageUrl?: string | null;
  images?: readonly string[];
  videos?: readonly string[];
  lat?: number | null;
  lng?: number | null;
  country?: string | null;
  city?: string | null;
  district?: string | null;
  description?: string | null;
  openingHours?: string | null;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  price?: number | null;
  reservationSupport?: boolean | null;
  paymentSupport?: boolean | null;
  ticketSupport?: boolean | null;
  pinnedAtIso?: string;
  metadata?: Record<string, unknown>;
};

function pickCover(
  objectType: RealityObjectV1["objectType"],
  input: BuildRealityObjectInput,
): string | null {
  return selectProjectionVisualUrl({
    objectType,
    imageUrls: input.images ?? [],
    preferredUrl: input.coverImageUrl,
    caption: input.title,
  });
}

function buildObjectId(input: {
  contextEventId: string;
  placeId: string;
  resourceId?: string | null;
}): string {
  const resource = input.resourceId?.trim();
  if (resource) {
    return `ro:${resource}`;
  }
  return `ro:${input.contextEventId.trim()}:${input.placeId.trim()}`;
}

export function buildRealityObject(
  input: BuildRealityObjectInput,
): RealityObjectV1 {
  const detectInput: DetectRealityObjectTypeInput = {
    title: input.title,
    pinKind: input.pinKind,
    categoryLabel: input.categoryLabel,
    cuisineHint: input.cuisineHint,
    placeId: input.placeId,
  };
  const objectType =
    input.objectTypeOverride ??
    detectRealityObjectType(detectInput);
  const stamp = input.pinnedAtIso?.trim() || new Date().toISOString();
  const coverImageUrl = pickCover(objectType, input);
  const images = [
    ...(coverImageUrl ? [coverImageUrl] : []),
    ...(input.images ?? []).filter((url) => url?.trim() && url !== coverImageUrl),
  ];

  const ontology: RealityObjectOntology = {
    category: input.categoryLabel ?? null,
    description: input.description ?? null,
    openingHours: input.openingHours ?? null,
    phone: input.phone ?? null,
    website: input.website ?? null,
    reservationSupport: input.reservationSupport ?? null,
    paymentSupport: input.paymentSupport ?? null,
    ticketSupport: input.ticketSupport ?? null,
    rating: input.rating ?? null,
    price: input.price ?? null,
    images,
    videos: input.videos ?? [],
  };

  return {
    version: 1,
    id: buildObjectId({
      contextEventId: input.contextEventId,
      placeId: input.placeId,
      resourceId: input.resourceId,
    }),
    title: input.title.trim(),
    objectType,
    coverImageUrl,
    location: {
      country: input.country ?? null,
      city: input.city ?? null,
      district: input.district ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    },
    ontology,
    execution: {
      capabilities: capabilitiesForObjectType(objectType),
    },
    relations: {
      relatedObjectIds: [],
    },
    timeline: {
      createdAtIso: stamp,
      pinnedAtIso: stamp,
      sourceContextEventId: input.contextEventId.trim(),
    },
    metadata: {
      placeId: input.placeId.trim(),
      ...(input.resourceId?.trim()
        ? { resourceId: input.resourceId.trim() }
        : {}),
      ...(input.metadata ?? {}),
    },
  };
}
