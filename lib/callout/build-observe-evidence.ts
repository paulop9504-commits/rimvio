/**
 * Build Observe Evidence list + AI Score from Workspace facts + graph.
 * Never invent distance / price / reviews — omit when not grounded.
 */

import type { Evidence, EvidenceGraphRef } from "@/lib/callout/evidence";
import type { NodePreviewModel } from "@/lib/context-workspace/build-node-preview";
import type {
  ContextWorkspaceNode,
  ContextWorkspaceRelationshipEdge,
} from "@/lib/context-workspace/types";

export type ObserveEvidenceNeighbor = {
  readonly objectId: string;
  readonly title: string;
  readonly kindKey: string;
  readonly labelKo: string;
  readonly meters: number | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
};

function selfRef(node: ContextWorkspaceNode): EvidenceGraphRef {
  return {
    kind: "self",
    nodeId: node.id,
    edgeId: null,
    lat: node.lat,
    lng: node.lng,
    toLat: null,
    toLng: null,
    toNodeId: null,
  };
}

function formatWalkMinutes(meters: number): string {
  const mins = Math.max(1, Math.round(meters / 80));
  return `${mins}분`;
}

function pickDistanceTarget(input: {
  node: ContextWorkspaceNode;
  preview: NodePreviewModel;
  neighbors: readonly ObserveEvidenceNeighbor[];
  edges: readonly ContextWorkspaceRelationshipEdge[];
}): {
  title: string;
  value: string;
  graphRef: EvidenceGraphRef;
  source: string;
} | null {
  const { node, preview, neighbors, edges } = input;

  const edgeHit = edges.find(
    (e) => e.fromId === node.id || e.toId === node.id,
  );
  if (edgeHit) {
    const otherId =
      edgeHit.fromId === node.id ? edgeHit.toId : edgeHit.fromId;
    const other =
      neighbors.find((n) => n.objectId === otherId) ??
      null;
    const meters = edgeHit.meters;
    const walk =
      meters != null && Number.isFinite(meters)
        ? formatWalkMinutes(meters)
        : null;
    return {
      title: walk ? `역·거점까지 ${walk}` : edgeHit.labelKo || "거리",
      value: walk
        ? `${walk}${meters != null ? ` · ${meters}m` : ""}`
        : edgeHit.labelKo,
      source: "relationship_edge",
      graphRef: {
        kind: "edge",
        nodeId: otherId,
        edgeId: edgeHit.id,
        lat: node.lat,
        lng: node.lng,
        toLat: other?.lat ?? null,
        toLng: other?.lng ?? null,
        toNodeId: otherId,
      },
    };
  }

  const nearby = preview.nearby.find((n) => Boolean(n.nodeId)) ?? preview.nearby[0];
  if (nearby) {
    const meters = nearby.meters;
    const walk =
      meters != null && Number.isFinite(meters)
        ? formatWalkMinutes(meters)
        : null;
    const targetId = nearby.nodeId;
    const neighbor = targetId
      ? neighbors.find((n) => n.objectId === targetId)
      : null;
    const cleanLabel = nearby.labelKo.replace(/^[^\s]+\s/u, "").trim();
    return {
      title: walk ? `${cleanLabel || "거점"}까지 ${walk}` : cleanLabel || "주변",
      value: nearby.labelKo,
      source: "nearby_preview",
      graphRef: {
        kind: targetId ? "edge" : "self",
        nodeId: targetId,
        edgeId: targetId ? `synthetic:${node.id}:${targetId}` : null,
        lat: node.lat,
        lng: node.lng,
        toLat: neighbor?.lat ?? null,
        toLng: neighbor?.lng ?? null,
        toNodeId: targetId,
      },
    };
  }

  const stationish = neighbors.find((n) =>
    /amenity|transit|subway|station|역|route/i.test(
      `${n.kindKey} ${n.labelKo} ${n.title}`,
    ),
  );
  if (stationish && stationish.meters != null) {
    const walk = formatWalkMinutes(stationish.meters);
    return {
      title: `역까지 ${walk}`,
      value: `${stationish.title} · ${stationish.meters}m`,
      source: "neighbor_graph",
      graphRef: {
        kind: "edge",
        nodeId: stationish.objectId,
        edgeId: `synthetic:${node.id}:${stationish.objectId}`,
        lat: node.lat,
        lng: node.lng,
        toLat: stationish.lat ?? null,
        toLng: stationish.lng ?? null,
        toNodeId: stationish.objectId,
      },
    };
  }

  return null;
}

function parseWhyBits(why: string): string[] {
  return why
    .split(/[·•|/]|(?:\s*[-–—]\s*)/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
    .slice(0, 4);
}

/** Weighted Observe AI Score 0–100 from present evidence only. */
export function scoreObserveAiScore(evidence: readonly Evidence[]): number {
  const present = evidence.filter((e) => e.present);
  if (present.length === 0) return 0;
  const weightSum = present.reduce((s, e) => s + e.weight, 0);
  const maxWeight = Math.max(
    evidence.reduce((s, e) => s + e.weight, 0),
    0.01,
  );
  const coverage = weightSum / maxWeight;
  const density = Math.min(1, present.length / 4);
  const raw = 0.55 + coverage * 0.35 + density * 0.08;
  return Math.min(96, Math.round(raw * 100));
}

export function buildObserveEvidence(input: {
  node: ContextWorkspaceNode;
  preview: NodePreviewModel;
  draftDayLabelKo?: string | null;
  neighbors?: readonly ObserveEvidenceNeighbor[];
  edges?: readonly ContextWorkspaceRelationshipEdge[];
}): Evidence[] {
  const {
    node,
    preview,
    draftDayLabelKo,
    neighbors = [],
    edges = [],
  } = input;
  const out: Evidence[] = [];

  const distance = pickDistanceTarget({ node, preview, neighbors, edges });
  if (distance) {
    out.push({
      id: "distance",
      type: "distance",
      title: distance.title,
      value: distance.value,
      weight: 0.28,
      source: distance.source,
      present: true,
      graphRef: distance.graphRef,
    });
  }

  const hasPrice =
    Boolean(preview.price?.trim()) &&
    preview.price !== "가격 미정" &&
    preview.price !== "—";
  if (hasPrice) {
    const budgetFit =
      /예산|가성비|적합|범위/u.test(preview.whyChosen) ||
      (node.priceBand != null && node.priceBand <= 3);
    out.push({
      id: "price",
      type: "price",
      title: budgetFit ? "예산 적합" : "가격",
      value: preview.price,
      weight: 0.22,
      source: "node_price",
      present: true,
      graphRef: selfRef(node),
    });
  }

  const whyBits = parseWhyBits(preview.whyChosen);
  const preferBit =
    whyBits.find((b) => /선호|지역|이전|동선|난바|선호/u.test(b)) ??
    whyBits[0] ??
    null;
  if (preferBit) {
    out.push({
      id: "preference",
      type: "preference",
      title: /선호|지역/u.test(preferBit)
        ? "사용자 선호 지역"
        : preferBit.slice(0, 24),
      value: preview.whyChosen.slice(0, 64),
      weight: 0.2,
      source: "why_chosen",
      present: true,
      graphRef: selfRef(node),
    });
  }

  if (draftDayLabelKo?.trim()) {
    out.push({
      id: "route_fit",
      type: "preference",
      title: "일정 동선 최적",
      value: draftDayLabelKo.trim(),
      weight: 0.18,
      source: "schedule",
      present: true,
      graphRef: {
        kind: "route",
        nodeId: node.id,
        edgeId: null,
        lat: node.lat,
        lng: node.lng,
        toLat: null,
        toLng: null,
        toNodeId: null,
      },
    });
  }

  const hasReview =
    preview.rating != null ||
    (preview.reviewSummary !== "후기 없음" && Boolean(preview.reviewSummary));
  if (hasReview) {
    out.push({
      id: "review",
      type: "review",
      title: "후기",
      value:
        preview.rating != null
          ? `${preview.ratingLabel} · ${preview.reviewSummary}`
          : preview.reviewSummary,
      weight: 0.18,
      source: "node_review",
      present: true,
      graphRef: {
        kind: "node",
        nodeId: node.id,
        edgeId: null,
        lat: node.lat,
        lng: node.lng,
        toLat: null,
        toLng: null,
        toNodeId: null,
      },
    });
  }

  if (preview.canPrepare) {
    out.push({
      id: "availability",
      type: "availability",
      title: "예약 가능성",
      value: "준비 가능",
      weight: 0.14,
      source: "capability",
      present: true,
      graphRef: selfRef(node),
    });
  }

  return out;
}

/** Line coords [lng,lat][] for map edge highlight from Evidence.graphRef */
export function evidenceHighlightLineCoords(
  evidence: Evidence,
): [number, number][] | null {
  const ref = evidence.graphRef;
  if (!ref) return null;
  if (
    (ref.kind === "edge" || ref.kind === "route") &&
    ref.lat != null &&
    ref.lng != null &&
    ref.toLat != null &&
    ref.toLng != null
  ) {
    return [
      [ref.lng, ref.lat],
      [ref.toLng, ref.toLat],
    ];
  }
  return null;
}
