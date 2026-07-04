import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/events/read-feed-capture-fragments";
import { extractMeaningObservations } from "@/lib/meaning/extract-meaning-observations";
import {
  createMeaningEdgeBuckets,
  ingestMeaningObservation,
  type MeaningEdgeBucket,
} from "@/lib/meaning/ingest-meaning-edge-buckets";
import { scoreMeaningEdge } from "@/lib/meaning/score-meaning-edge";
import { projectBridgeNode } from "@/lib/experience-graph/project-experience-subgraph";
import { entityEdgeId } from "@/lib/ontology/entity-edge-id";
import {
  entityEdgeFromMeaningBucket,
  upsertEntityEdge,
} from "@/lib/ontology/edge-store";
import type { EntityEdge, EntityEdgeEvidence } from "@/lib/ontology/edge-types";
import { asRimvioEntityId } from "@/lib/ontology/entity-types";
import { materializePhase2EntityEdgesFromEvent } from "@/lib/ontology/materialize-entity-edges-phase2";

function upsertMeaningBucket(
  bucket: MeaningEdgeBucket,
  now: Date,
): void {
  const nowMs = now.getTime();
  const score = scoreMeaningEdge(bucket.acc, nowMs);
  const atIso = now.toISOString();
  const edge = entityEdgeFromMeaningBucket({
    kind: bucket.kind,
    fromId: bucket.fromId,
    toId: bucket.toId,
    eventIds: [...bucket.acc.eventIds],
    weight: score.total,
    atIso,
  });
  upsertEntityEdge(edge);
}

function upsertExtensionEdge(input: {
  kind: EntityEdge["kind"];
  fromEntityId: ReturnType<typeof asRimvioEntityId>;
  toEntityId: ReturnType<typeof asRimvioEntityId>;
  evidence: EntityEdgeEvidence[];
  atIso: string;
  weight?: number;
}): void {
  if (input.evidence.length === 0) {
    return;
  }
  const edge: EntityEdge = {
    id: entityEdgeId(input.kind, input.fromEntityId, input.toEntityId),
    kind: input.kind,
    fromEntityId: input.fromEntityId,
    toEntityId: input.toEntityId,
    weight: input.weight ?? 50,
    evidence: input.evidence,
    createdAt: input.atIso,
    updatedAt: input.atIso,
  };
  upsertEntityEdge(edge);
}

/**
 * Commit hook — deterministic entity edges from one EventCandidate.
 * Synchronous; no LLM. Skips archived events (read-time filter handles recall).
 */
export function materializeEntityEdges(
  event: EventCandidate,
  now = new Date(),
): void {
  if (event.lifecycle === "archived") {
    return;
  }

  const atIso = now.toISOString();
  const eventEvidence: EntityEdgeEvidence = { type: "event", id: event.id };

  const observations = extractMeaningObservations([event]);
  const buckets = createMeaningEdgeBuckets();
  for (const row of observations) {
    ingestMeaningObservation(buckets, row);
  }
  for (const bucket of buckets.values()) {
    upsertMeaningBucket(bucket, now);
  }

  const experienceEntityId = asRimvioEntityId("experience", event.id);
  for (const capture of readFeedCaptureFragments(event)) {
    upsertExtensionEdge({
      kind: "capture_belongs",
      fromEntityId: asRimvioEntityId("capture", capture.id),
      toEntityId: experienceEntityId,
      evidence: [eventEvidence, { type: "capture", id: capture.id }],
      atIso,
    });
  }

  const bridge = projectBridgeNode(event);
  const peerThreadId = bridge?.peerThreadId?.trim();
  if (bridge && peerThreadId) {
    upsertExtensionEdge({
      kind: "thread_mention",
      fromEntityId: asRimvioEntityId("thread", peerThreadId),
      toEntityId: experienceEntityId,
      evidence: [eventEvidence],
      atIso,
    });
  }

  materializePhase2EntityEdgesFromEvent(event, atIso);
}
