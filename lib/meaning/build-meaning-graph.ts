import { extractMeaningObservations } from "@/lib/meaning/extract-meaning-observations";
import { formatMeaningLabel } from "@/lib/meaning/format-meaning-label";
import {
  buildMeaningBucketsFromObservations,
  type MeaningEdgeBucket,
} from "@/lib/meaning/ingest-meaning-edge-buckets";
import { meaningEdgeId } from "@/lib/meaning/meaning-node-id";
import { scoreMeaningEdge } from "@/lib/meaning/score-meaning-edge";
import {
  MEANING_MIN_EDGE_TOTAL,
  type MeaningEdge,
  type MeaningGraph,
  type MeaningNode,
  type MeaningNodeKind,
} from "@/lib/meaning/meaning-types";
import type { EventCandidate } from "@/lib/events/event-candidate";

function nodeKindFromId(id: string): MeaningNodeKind {
  if (id.startsWith("person:")) {
    return "person";
  }
  if (id.startsWith("place:")) {
    return "place";
  }
  return "experience";
}

function registerNode(
  nodeMap: Map<string, MeaningNode>,
  id: string,
  label: string,
  edgeTotal: number,
  eventCount: number,
): void {
  const existing = nodeMap.get(id);
  if (existing) {
    existing.score += edgeTotal;
    existing.eventCount += eventCount;
    return;
  }
  nodeMap.set(id, {
    id,
    kind: nodeKindFromId(id),
    label,
    score: edgeTotal,
    eventCount,
  });
}

function buildNodes(edges: readonly MeaningEdge[]): MeaningNode[] {
  const nodeMap = new Map<string, MeaningNode>();

  for (const edge of edges) {
    registerNode(
      nodeMap,
      edge.from,
      edge.fromLabel,
      edge.score.total,
      edge.score.frequency,
    );
    registerNode(
      nodeMap,
      edge.to,
      edge.toLabel,
      edge.score.total,
      edge.score.frequency,
    );
  }

  return [...nodeMap.values()].sort((a, b) => b.score - a.score);
}

function bucketToMeaningEdge(bucket: MeaningEdgeBucket, nowMs: number): MeaningEdge {
  const score = scoreMeaningEdge(bucket.acc, nowMs);
  return {
    id: meaningEdgeId(bucket.kind, bucket.fromId, bucket.toId),
    kind: bucket.kind,
    from: bucket.fromId,
    to: bucket.toId,
    fromLabel: bucket.fromLabel,
    toLabel: bucket.toLabel,
    score,
    meaningLabel: formatMeaningLabel({
      kind: bucket.kind,
      fromLabel: bucket.fromLabel,
      toLabel: bucket.toLabel,
      frequency: score.frequency,
    }),
    eventIds: [...bucket.acc.eventIds],
  };
}

/** Pure read — build meaning graph from committed events. */
export function buildMeaningGraph(
  events: readonly EventCandidate[],
  now = new Date(),
): MeaningGraph {
  const observations = extractMeaningObservations(events);
  const buckets = buildMeaningBucketsFromObservations(observations);
  const nowMs = now.getTime();

  const edges: MeaningEdge[] = [];

  for (const bucket of buckets.values()) {
    const edge = bucketToMeaningEdge(bucket, nowMs);
    if (edge.score.total < MEANING_MIN_EDGE_TOTAL && edge.score.frequency < 2) {
      continue;
    }
    edges.push(edge);
  }

  edges.sort((a, b) => b.score.total - a.score.total || b.score.frequency - a.score.frequency);

  return {
    nodes: buildNodes(edges),
    edges,
    builtAt: now.toISOString(),
    observationCount: observations.length,
  };
}
