import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  RealityObjectRelationEdgeV1,
  RealityObjectV1,
  RealityPinCompatKind,
} from "@/lib/reality-object/types";
import {
  REALITY_OBJECT_PRIMARY_ID_META_KEY,
  REALITY_OBJECTS_META_KEY,
} from "@/lib/reality-object/types";

function readTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseRelationEdge(raw: unknown): RealityObjectRelationEdgeV1 | null {
  if (!isObjectRecord(raw)) {
    return null;
  }
  const relatedObjectId = readTrimmedString(raw.relatedObjectId);
  const score =
    typeof raw.score === "number" && Number.isFinite(raw.score)
      ? raw.score
      : null;
  const relationKind = readTrimmedString(raw.relationKind);
  if (
    !relatedObjectId ||
    score == null ||
    !relationKind ||
    !["travel", "recommend", "booking_order", "visited"].includes(relationKind)
  ) {
    return null;
  }
  const pinKindRaw = readTrimmedString(raw.pinKind);
  const pinKind =
    pinKindRaw === "eatery" ||
    pinKindRaw === "lodging" ||
    pinKindRaw === "activity" ||
    pinKindRaw === "amenity"
      ? (pinKindRaw as RealityPinCompatKind)
      : null;
  return {
    relatedObjectId,
    resourceId: readTrimmedString(raw.resourceId),
    label: readTrimmedString(raw.label),
    pinKind,
    score,
    relationKind: relationKind as RealityObjectRelationEdgeV1["relationKind"],
    lat:
      typeof raw.lat === "number" && Number.isFinite(raw.lat) ? raw.lat : null,
    lng:
      typeof raw.lng === "number" && Number.isFinite(raw.lng) ? raw.lng : null,
  };
}

function parseRealityObject(raw: unknown): RealityObjectV1 | null {
  if (!isObjectRecord(raw)) {
    return null;
  }
  if (raw.version !== 1) {
    return null;
  }
  const id = readTrimmedString(raw.id);
  const title = readTrimmedString(raw.title);
  const objectType = readTrimmedString(raw.objectType);
  if (!id || !title || !objectType) {
    return null;
  }
  const location = isObjectRecord(raw.location) ? raw.location : {};
  const ontology = isObjectRecord(raw.ontology) ? raw.ontology : {};
  const execution = isObjectRecord(raw.execution) ? raw.execution : {};
  const relations = isObjectRecord(raw.relations) ? raw.relations : {};
  const timeline = isObjectRecord(raw.timeline) ? raw.timeline : {};
  const capabilities = Array.isArray(execution.capabilities)
    ? execution.capabilities.filter(
        (item): item is RealityObjectV1["execution"]["capabilities"][number] =>
          typeof item === "string",
      )
    : [];

  return {
    version: 1,
    id,
    title,
    objectType: objectType as RealityObjectV1["objectType"],
    coverImageUrl: readTrimmedString(raw.coverImageUrl),
    location: {
      country: readTrimmedString(location.country),
      city: readTrimmedString(location.city),
      district: readTrimmedString(location.district),
      lat:
        typeof location.lat === "number" && Number.isFinite(location.lat)
          ? location.lat
          : null,
      lng:
        typeof location.lng === "number" && Number.isFinite(location.lng)
          ? location.lng
          : null,
    },
    ontology: {
      category: readTrimmedString(ontology.category),
      description: readTrimmedString(ontology.description),
      openingHours: readTrimmedString(ontology.openingHours),
      phone: readTrimmedString(ontology.phone),
      website: readTrimmedString(ontology.website),
      reservationSupport:
        typeof ontology.reservationSupport === "boolean"
          ? ontology.reservationSupport
          : null,
      paymentSupport:
        typeof ontology.paymentSupport === "boolean"
          ? ontology.paymentSupport
          : null,
      ticketSupport:
        typeof ontology.ticketSupport === "boolean"
          ? ontology.ticketSupport
          : null,
      rating:
        typeof ontology.rating === "number" && Number.isFinite(ontology.rating)
          ? ontology.rating
          : null,
      price:
        typeof ontology.price === "number" && Number.isFinite(ontology.price)
          ? ontology.price
          : null,
      images: Array.isArray(ontology.images)
        ? ontology.images.filter((u): u is string => typeof u === "string")
        : [],
      videos: Array.isArray(ontology.videos)
        ? ontology.videos.filter((u): u is string => typeof u === "string")
        : [],
    },
    execution: { capabilities },
    relations: {
      relatedObjectIds: Array.isArray(relations.relatedObjectIds)
        ? relations.relatedObjectIds.filter(
            (u): u is string => typeof u === "string",
          )
        : [],
      edges: Array.isArray(relations.edges)
        ? relations.edges
            .map(parseRelationEdge)
            .filter((edge): edge is RealityObjectRelationEdgeV1 => edge != null)
        : undefined,
      bloomRankedAtIso: readTrimmedString(relations.bloomRankedAtIso),
    },
    timeline: {
      createdAtIso:
        readTrimmedString(timeline.createdAtIso) ?? new Date().toISOString(),
      pinnedAtIso:
        readTrimmedString(timeline.pinnedAtIso) ?? new Date().toISOString(),
      sourceContextEventId:
        readTrimmedString(timeline.sourceContextEventId) ?? "",
    },
    metadata: isObjectRecord(raw.metadata) ? { ...raw.metadata } : {},
  };
}

export function listRealityObjects(
  event: EventCandidate | null | undefined,
): RealityObjectV1[] {
  if (!event) {
    return [];
  }
  const raw = event.metadata?.[REALITY_OBJECTS_META_KEY];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map(parseRealityObject)
    .filter((item): item is RealityObjectV1 => item != null);
}

export function readPrimaryRealityObject(
  event: EventCandidate | null | undefined,
): RealityObjectV1 | null {
  const objects = listRealityObjects(event);
  if (objects.length === 0) {
    return null;
  }
  const primaryId = readTrimmedString(
    event?.metadata?.[REALITY_OBJECT_PRIMARY_ID_META_KEY],
  );
  if (primaryId) {
    const hit = objects.find((item) => item.id === primaryId);
    if (hit) {
      return hit;
    }
  }
  return objects[0] ?? null;
}

export function findRealityObjectByPlaceId(
  event: EventCandidate | null | undefined,
  placeId: string,
): RealityObjectV1 | null {
  const needle = placeId.trim();
  if (!needle) {
    return null;
  }
  return (
    listRealityObjects(event).find((item) => {
      const metaPlace = readTrimmedString(item.metadata.placeId);
      return metaPlace === needle;
    }) ?? null
  );
}

/** Upsert object onto event metadata; sets primary id to this object. */
export function upsertRealityObjectMetadata(input: {
  metadata?: Record<string, unknown> | null;
  object: RealityObjectV1;
}): Record<string, unknown> {
  const next = { ...(input.metadata ?? {}) };
  const existingRaw = next[REALITY_OBJECTS_META_KEY];
  const existing = Array.isArray(existingRaw)
    ? existingRaw
        .map(parseRealityObject)
        .filter((item): item is RealityObjectV1 => item != null)
    : [];
  const without = existing.filter((item) => item.id !== input.object.id);
  next[REALITY_OBJECTS_META_KEY] = [...without, input.object];
  next[REALITY_OBJECT_PRIMARY_ID_META_KEY] = input.object.id;
  return next;
}

/** Prefer Reality Object cover for globe / runtime preview projection. */
export function resolveRealityObjectCoverUrl(
  event: EventCandidate | null | undefined,
  fallback?: string | null,
): string | null {
  const primary = readPrimaryRealityObject(event);
  const cover = primary?.coverImageUrl?.trim();
  if (cover) {
    return cover;
  }
  const fromOntology = primary?.ontology.images?.find((url) => url?.trim());
  if (fromOntology?.trim()) {
    return fromOntology.trim();
  }
  return fallback?.trim() || null;
}

/**
 * Cover for a place on the globe — object cover wins over inventory thumb.
 * Never invent a generic pin when cover exists.
 */
export function resolveRealityObjectCoverForPlace(input: {
  event: EventCandidate | null | undefined;
  placeId?: string | null;
  fallback?: string | null;
}): string | null {
  const placeId = input.placeId?.trim();
  if (placeId) {
    const byPlace = findRealityObjectByPlaceId(input.event, placeId);
    const cover = byPlace?.coverImageUrl?.trim();
    if (cover) {
      return cover;
    }
    const fromOntology = byPlace?.ontology.images?.find((url) => url?.trim());
    if (fromOntology?.trim()) {
      return fromOntology.trim();
    }
  }
  return resolveRealityObjectCoverUrl(input.event, input.fallback);
}
