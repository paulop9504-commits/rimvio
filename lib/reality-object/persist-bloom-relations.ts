/**
 * Persist / reuse Context Bloom ranked relations on RealityObject.relations.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  buildRealityObject,
} from "@/lib/reality-object/build-reality-object";
import { resolveRealityObjectForCard } from "@/lib/reality-object/resolve-reality-object-for-card";
import {
  listRealityObjects,
  upsertRealityObjectMetadata,
} from "@/lib/reality-object/store";
import type {
  RealityObjectRelationEdgeV1,
  RealityObjectV1,
} from "@/lib/reality-object/types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import type {
  BloomRelationKind,
  ContextBloomCandidate,
  ContextBloomRelatedHit,
} from "@/lib/visual-projection/context-bloom-types";
import { rankContextBloomRelations } from "@/lib/visual-projection/rank-context-bloom-relations";

const RELATION_KINDS = new Set<BloomRelationKind>([
  "travel",
  "recommend",
  "booking_order",
  "visited",
]);

function relatedObjectIdFor(hit: ContextBloomRelatedHit): string {
  const resource = hit.resourceId?.trim();
  if (resource) {
    return `ro:${resource}`;
  }
  return `ro:bloom:${hit.id}`;
}

export function bloomHitsToRelationEdges(
  related: readonly ContextBloomRelatedHit[],
): RealityObjectRelationEdgeV1[] {
  return related.map((hit) => ({
    relatedObjectId: relatedObjectIdFor(hit),
    resourceId: hit.resourceId,
    label: hit.label,
    pinKind: hit.pinKind,
    score: hit.score,
    relationKind: hit.relationKind,
    lat: hit.lat,
    lng: hit.lng,
  }));
}

export function applyBloomRelationsToObject(input: {
  object: RealityObjectV1;
  related: readonly ContextBloomRelatedHit[];
  nowIso?: string;
}): RealityObjectV1 {
  const edges = bloomHitsToRelationEdges(input.related);
  return {
    ...input.object,
    relations: {
      relatedObjectIds: edges.map((edge) => edge.relatedObjectId),
      edges,
      bloomRankedAtIso: input.nowIso ?? new Date().toISOString(),
    },
  };
}

/**
 * Map persisted edges → bloom hits when the candidate is still on the globe.
 */
export function hydrateBloomRelatedFromEdges(input: {
  edges: readonly RealityObjectRelationEdgeV1[];
  candidates: readonly ContextBloomCandidate[];
  maxRelated?: number;
}): ContextBloomRelatedHit[] {
  const maxRelated = input.maxRelated ?? 4;
  const byResource = new Map(
    input.candidates.map((row) => [row.resourceId, row] as const),
  );
  const hits: ContextBloomRelatedHit[] = [];
  for (const edge of input.edges) {
    if (hits.length >= maxRelated) {
      break;
    }
    const resourceId = edge.resourceId?.trim();
    const candidate = resourceId ? byResource.get(resourceId) : undefined;
    if (!candidate) {
      continue;
    }
    const kind = RELATION_KINDS.has(edge.relationKind as BloomRelationKind)
      ? (edge.relationKind as BloomRelationKind)
      : "recommend";
    hits.push({
      id: candidate.id,
      resourceId: candidate.resourceId,
      label: candidate.label,
      lat: candidate.lat,
      lng: candidate.lng,
      pinKind: candidate.pinKind,
      score: edge.score,
      relationKind: kind,
      bloomDelayMs: 100 * (hits.length + 1),
    });
  }
  return hits;
}

/**
 * Prefer persisted edges still present in candidates; fill with live rank.
 */
export function resolveBloomRelatedForSelect(input: {
  selected: ContextBloomCandidate;
  candidates: readonly ContextBloomCandidate[];
  preferredRelated?: readonly ContextBloomRelatedHit[] | null;
  maxRelated?: number;
}): ContextBloomRelatedHit[] {
  const maxRelated = input.maxRelated ?? 4;
  const preferred = (input.preferredRelated ?? []).slice(0, maxRelated);
  if (preferred.length >= 2) {
    return preferred.map((row, index) => ({
      ...row,
      bloomDelayMs: 100 * (index + 1),
    }));
  }
  const live = rankContextBloomRelations({
    selected: input.selected,
    candidates: input.candidates,
    maxRelated,
  });
  if (preferred.length === 0) {
    return live;
  }
  const seen = new Set(preferred.map((row) => row.resourceId));
  const merged = [...preferred];
  for (const row of live) {
    if (merged.length >= maxRelated) {
      break;
    }
    if (seen.has(row.resourceId)) {
      continue;
    }
    merged.push(row);
    seen.add(row.resourceId);
  }
  return merged.map((row, index) => ({
    ...row,
    bloomDelayMs: 100 * (index + 1),
  }));
}

export function readPersistedBloomRelated(input: {
  event?: EventCandidate | null;
  selected: ContextBloomCandidate;
  candidates: readonly ContextBloomCandidate[];
  maxRelated?: number;
}): ContextBloomRelatedHit[] {
  const object = resolveRealityObjectForCard({
    event: input.event,
    resourceId: input.selected.resourceId,
    placeId: input.selected.placeId,
  });
  const edges = object?.relations.edges;
  if (!edges?.length) {
    return [];
  }
  return hydrateBloomRelatedFromEdges({
    edges,
    candidates: input.candidates,
    maxRelated: input.maxRelated,
  });
}

function ensureSelectedObject(input: {
  event: EventCandidate;
  selected: ContextBloomCandidate;
}): RealityObjectV1 {
  const existing = resolveRealityObjectForCard({
    event: input.event,
    resourceId: input.selected.resourceId,
    placeId: input.selected.placeId,
  });
  if (existing) {
    return existing;
  }
  return buildRealityObject({
    contextEventId: input.event.id,
    title: input.selected.label,
    placeId:
      input.selected.placeId?.trim() ||
      input.selected.resourceId ||
      input.selected.id,
    resourceId: input.selected.resourceId,
    pinKind: input.selected.pinKind,
    lat: input.selected.lat,
    lng: input.selected.lng,
  });
}

/**
 * Write bloom ranks onto the selected Reality Object (event metadata).
 * Returns updated event, or null when context event is missing.
 */
export function persistContextBloomRelationsOnEvent(input: {
  contextEventId: string;
  selected: ContextBloomCandidate;
  related: readonly ContextBloomRelatedHit[];
  event?: EventCandidate | null;
}): EventCandidate | null {
  const eventId = input.contextEventId.trim();
  if (!eventId) {
    return null;
  }
  const event =
    input.event ?? findLifeEventCandidate(eventId);
  if (!event) {
    return null;
  }
  const base = ensureSelectedObject({ event, selected: input.selected });
  const nextObject = applyBloomRelationsToObject({
    object: base,
    related: input.related,
  });
  const metadata = upsertRealityObjectMetadata({
    metadata: event.metadata,
    object: nextObject,
  });
  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    description: event.description,
    containerId: event.containerId,
    confidence: event.confidence,
    metadata,
    lifecycleUpdatedAt: event.lifecycleUpdatedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export function listObjectsWithBloomEdges(
  event: EventCandidate | null | undefined,
): RealityObjectV1[] {
  return listRealityObjects(event).filter(
    (row) => (row.relations.edges?.length ?? 0) > 0,
  );
}
