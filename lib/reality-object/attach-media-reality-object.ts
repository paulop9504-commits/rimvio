/**
 * Photo / Reel / Video → Reality Object on the context event.
 * Same Reality Graph as place objects — not a parallel media bookmark store.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  buildRealityObject,
  type BuildRealityObjectInput,
} from "@/lib/reality-object/build-reality-object";
import {
  resolveMediaRealityObjectType,
  type MediaRealityIngressKind,
} from "@/lib/reality-object/resolve-media-object-type";
import { upsertRealityObjectMetadata } from "@/lib/reality-object/store";
import type { RealityObjectV1 } from "@/lib/reality-object/types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";

function defaultTitle(kind: MediaRealityIngressKind, placeLabel?: string | null): string {
  const place = placeLabel?.trim();
  if (place) {
    return place;
  }
  if (kind === "photo") {
    return "사진";
  }
  if (kind === "reel") {
    return "숏폼";
  }
  return "영상";
}

export function buildMediaRealityObject(input: {
  contextEventId: string;
  mediaId: string;
  mediaKind: MediaRealityIngressKind;
  title?: string | null;
  placeLabel?: string | null;
  coverImageUrl?: string | null;
  sourceUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  capturedAtIso?: string | null;
}): RealityObjectV1 {
  const objectType =
    resolveMediaRealityObjectType({
      kind: input.mediaKind,
      sourceUrl: input.sourceUrl,
    }) ?? input.mediaKind;
  const resourceId = `${input.contextEventId.trim()}:media:${input.mediaId.trim()}`;
  const placeId = `media:${input.mediaId.trim()}`;
  const title =
    input.title?.trim() ||
    defaultTitle(objectType === "reel" ? "reel" : input.mediaKind, input.placeLabel);
  const cover = input.coverImageUrl?.trim() || null;
  const sourceUrl = input.sourceUrl?.trim() || null;
  const build: BuildRealityObjectInput = {
    contextEventId: input.contextEventId,
    title,
    placeId,
    resourceId,
    objectTypeOverride: objectType,
    coverImageUrl: cover,
    images: cover ? [cover] : [],
    videos:
      objectType === "video" || objectType === "reel"
        ? sourceUrl
          ? [sourceUrl]
          : []
        : [],
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    description: input.placeLabel?.trim() || null,
    website: sourceUrl,
    pinnedAtIso: input.capturedAtIso ?? undefined,
    categoryLabel:
      objectType === "photo"
        ? "사진"
        : objectType === "reel"
          ? "숏폼"
          : "영상",
    metadata: {
      mediaId: input.mediaId.trim(),
      mediaKind: objectType,
      ...(sourceUrl ? { sourceUrl } : {}),
    },
  };
  return buildRealityObject(build);
}

/** Upsert media Reality Object onto event metadata (no Commit yet). */
export function attachMediaRealityObjectMetadata(input: {
  metadata?: Record<string, unknown> | null;
  contextEventId: string;
  mediaId: string;
  mediaKind: MediaRealityIngressKind;
  title?: string | null;
  placeLabel?: string | null;
  coverImageUrl?: string | null;
  sourceUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  capturedAtIso?: string | null;
}): { metadata: Record<string, unknown>; object: RealityObjectV1 } {
  const object = buildMediaRealityObject(input);
  return {
    object,
    metadata: upsertRealityObjectMetadata({
      metadata: input.metadata,
      object,
    }),
  };
}

/** Commit media Reality Object onto a context event. */
export function commitMediaRealityObjectToEvent(input: {
  event: EventCandidate;
  mediaId: string;
  mediaKind: MediaRealityIngressKind;
  title?: string | null;
  placeLabel?: string | null;
  coverImageUrl?: string | null;
  sourceUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  capturedAtIso?: string | null;
}): EventCandidate {
  const { metadata } = attachMediaRealityObjectMetadata({
    metadata: input.event.metadata,
    contextEventId: input.event.id,
    mediaId: input.mediaId,
    mediaKind: input.mediaKind,
    title: input.title,
    placeLabel: input.placeLabel,
    coverImageUrl: input.coverImageUrl,
    sourceUrl: input.sourceUrl,
    lat: input.lat,
    lng: input.lng,
    capturedAtIso: input.capturedAtIso,
  });
  const stamp = new Date().toISOString();
  return commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.event.lifecycle,
    datetime: input.event.datetime,
    place: input.event.place,
    description: input.event.description,
    containerId: input.event.containerId,
    confidence: input.event.confidence,
    metadata,
    lifecycleUpdatedAt: input.event.lifecycleUpdatedAt ?? stamp,
    updatedAt: stamp,
  });
}

function eventIdFromExperienceEntityId(entityId: string): string | null {
  const prefix = "experience:";
  const trimmed = entityId.trim();
  if (!trimmed.startsWith(prefix)) {
    return null;
  }
  return trimmed.slice(prefix.length).trim() || null;
}

/** YouTube / public guide → video or reel Reality Object on the experience event. */
export function commitMediaGuideAsRealityObject(input: {
  guide: MediaGuideNode;
  event?: EventCandidate | null;
}): EventCandidate | null {
  const eventId =
    eventIdFromExperienceEntityId(input.guide.relatedExperienceEntityId) ??
    null;
  if (!eventId) {
    return null;
  }
  const event = input.event ?? findLifeEventCandidate(eventId);
  if (!event) {
    return null;
  }
  const mediaKind =
    resolveMediaRealityObjectType({
      kind: "video",
      sourceUrl: input.guide.canonicalUrl,
    }) === "reel"
      ? ("reel" as const)
      : ("video" as const);
  return commitMediaRealityObjectToEvent({
    event,
    mediaId: input.guide.guideNodeId,
    mediaKind,
    title: input.guide.title,
    placeLabel: input.guide.relatedPlaceLabel,
    coverImageUrl: input.guide.thumbnailUrl,
    sourceUrl: input.guide.canonicalUrl,
    capturedAtIso: input.guide.createdAt,
  });
}

/** After media guides refresh — upsert Reality Objects for each guide. */
export function syncMediaGuideRealityObjects(input: {
  experienceEntityId: string;
  guides: readonly MediaGuideNode[];
}): number {
  const eventId = eventIdFromExperienceEntityId(input.experienceEntityId);
  if (!eventId) {
    return 0;
  }
  let event = findLifeEventCandidate(eventId);
  if (!event) {
    return 0;
  }
  let count = 0;
  for (const guide of input.guides) {
    const next = commitMediaGuideAsRealityObject({ guide, event });
    if (next) {
      event = next;
      count += 1;
    }
  }
  return count;
}
