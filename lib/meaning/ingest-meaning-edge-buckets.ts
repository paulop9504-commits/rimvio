import type { MeaningObservation } from "@/lib/meaning/extract-meaning-observations";
import {
  meaningEdgeId,
  meaningNodeId,
} from "@/lib/meaning/meaning-node-id";
import {
  createMeaningEdgeAccumulator,
  type MeaningEdgeAccumulator,
} from "@/lib/meaning/score-meaning-edge";
import type { MeaningEdgeKind, MeaningNodeKind } from "@/lib/meaning/meaning-types";

export type MeaningEdgeBucket = {
  kind: MeaningEdgeKind;
  fromId: string;
  toId: string;
  fromLabel: string;
  toLabel: string;
  acc: MeaningEdgeAccumulator;
};

export function createMeaningEdgeBuckets(): Map<string, MeaningEdgeBucket> {
  return new Map();
}

export function touchMeaningEdge(
  buckets: Map<string, MeaningEdgeBucket>,
  input: {
    kind: MeaningEdgeKind;
    fromKind: MeaningNodeKind;
    fromLabel: string;
    toKind: MeaningNodeKind;
    toLabel: string;
    eventId: string;
    atMs: number;
    dwellMinutes: number;
    verifyCount: number;
    coPresenceHits?: number;
  },
): void {
  const fromId = meaningNodeId(input.fromKind, input.fromLabel);
  const toId = meaningNodeId(input.toKind, input.toLabel);
  const id = meaningEdgeId(input.kind, fromId, toId);

  let bucket = buckets.get(id);
  if (!bucket) {
    bucket = {
      kind: input.kind,
      fromId,
      toId,
      fromLabel: input.fromLabel,
      toLabel: input.toLabel,
      acc: createMeaningEdgeAccumulator(),
    };
    buckets.set(id, bucket);
  }

  bucket.acc.eventIds.add(input.eventId);
  bucket.acc.lastAtMs = Math.max(bucket.acc.lastAtMs, input.atMs);
  bucket.acc.totalDwellMinutes += input.dwellMinutes;
  bucket.acc.verifyCount += input.verifyCount;
  bucket.acc.coPresenceHits += input.coPresenceHits ?? 1;
}

export function ingestMeaningObservation(
  buckets: Map<string, MeaningEdgeBucket>,
  row: MeaningObservation,
): void {
  const atMs = Date.parse(row.atIso) || Date.now();

  for (const person of row.people) {
    for (const place of row.places) {
      touchMeaningEdge(buckets, {
        kind: "person_place",
        fromKind: "person",
        fromLabel: person,
        toKind: "place",
        toLabel: place,
        eventId: row.eventId,
        atMs,
        dwellMinutes: row.dwellMinutes,
        verifyCount: row.verifyCount,
      });
    }

    touchMeaningEdge(buckets, {
      kind: "person_experience",
      fromKind: "person",
      fromLabel: person,
      toKind: "experience",
      toLabel: row.experienceKey,
      eventId: row.eventId,
      atMs,
      dwellMinutes: row.dwellMinutes,
      verifyCount: row.verifyCount,
    });
  }

  for (const place of row.places) {
    touchMeaningEdge(buckets, {
      kind: "place_experience",
      fromKind: "place",
      fromLabel: place,
      toKind: "experience",
      toLabel: row.experienceKey,
      eventId: row.eventId,
      atMs,
      dwellMinutes: row.dwellMinutes,
      verifyCount: row.verifyCount,
    });
  }

  if (row.people.length >= 2) {
    for (let i = 0; i < row.people.length; i += 1) {
      for (let j = i + 1; j < row.people.length; j += 1) {
        touchMeaningEdge(buckets, {
          kind: "person_person",
          fromKind: "person",
          fromLabel: row.people[i]!,
          toKind: "person",
          toLabel: row.people[j]!,
          eventId: row.eventId,
          atMs,
          dwellMinutes: row.dwellMinutes,
          verifyCount: row.verifyCount,
          coPresenceHits: 2,
        });
      }
    }
  }
}

export function buildMeaningBucketsFromObservations(
  observations: readonly MeaningObservation[],
): Map<string, MeaningEdgeBucket> {
  const buckets = createMeaningEdgeBuckets();
  for (const row of observations) {
    ingestMeaningObservation(buckets, row);
  }
  return buckets;
}
