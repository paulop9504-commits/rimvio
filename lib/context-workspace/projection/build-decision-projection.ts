/**
 * Decision Score Builder — Node Preview → Decision Projection.
 *
 * Compare is Context-weighted judgment, not a price/rating list.
 *
 * Preview (facts):     가격 · 평점 · why blob
 * Projection (decide): total score · judgmentKo · relationships · select
 */

import type {
  ContextWorkspaceNode,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";
import {
  TRIP_CONTEXT_COMPARE_WEIGHTS,
  type CompareDecisionCriteriaWeights,
  type CompareDecisionRelationship,
  type DecisionProjection,
  type DecisionProjectionScores,
} from "@/lib/context-workspace/projection/types";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeWeights(
  w: CompareDecisionCriteriaWeights,
): CompareDecisionCriteriaWeights {
  const sum = w.price + w.location + w.scheduleFit;
  if (sum <= 0) return TRIP_CONTEXT_COMPARE_WEIGHTS;
  return {
    price: w.price / sum,
    location: w.location / sum,
    scheduleFit: w.scheduleFit / sum,
  };
}

/**
 * Resolve criteria from Context signals (trip draft / destination → trip weights).
 * Domain-agnostic — not hotel_compare_weights.
 */
export function resolveCompareCriteriaWeights(
  state: Pick<
    ContextWorkspaceState,
    "realityDraft" | "summaryKo" | "query" | "domain"
  >,
): CompareDecisionCriteriaWeights {
  const blob = [
    state.summaryKo,
    state.query,
    state.realityDraft?.destinationKo ?? "",
    state.realityDraft?.contextTitleKo ?? "",
    state.realityDraft?.stayLabelKo ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const looksLikeTrip =
    Boolean(state.realityDraft?.days?.length) ||
    /trip|여행|오사카|osaka|도쿄|tokyo|일정|usj|유니버설/i.test(blob);

  if (looksLikeTrip) {
    return TRIP_CONTEXT_COMPARE_WEIGHTS;
  }

  if (state.domain === "eatery") {
    return normalizeWeights({ price: 0.35, location: 0.4, scheduleFit: 0.25 });
  }

  return TRIP_CONTEXT_COMPARE_WEIGHTS;
}

function parsePriceWon(node: ContextWorkspaceNode): number | null {
  const label = node.amountLabel?.trim() ?? "";
  const digits = label.replace(/[^\d]/g, "");
  if (digits.length >= 3) {
    const n = Number(digits);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (node.priceBand != null && Number.isFinite(node.priceBand)) {
    return node.priceBand * 80_000;
  }
  return null;
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function isAttractionLike(node: ContextWorkspaceNode): boolean {
  const blob = `${node.title} ${node.tags.join(" ")} ${node.summaryKo}`;
  return (
    node.kind === "poi" ||
    /usj|유니버설|도톤|doton|난바|namba|관광|theme|attraction/iu.test(blob)
  );
}

function contextAnchors(
  state: ContextWorkspaceState,
): ContextWorkspaceNode[] {
  const fromDraft =
    state.realityDraft?.nodeIds
      .map((id) => state.nodes.find((n) => n.id === id))
      .filter(
        (n): n is ContextWorkspaceNode => n != null && isAttractionLike(n),
      ) ?? [];
  if (fromDraft.length > 0) return fromDraft.slice(0, 4);
  return state.nodes.filter((n) => n.visible && isAttractionLike(n)).slice(0, 4);
}

function minMetersToAnchors(
  node: ContextWorkspaceNode,
  anchors: readonly ContextWorkspaceNode[],
  edges: ContextWorkspaceState["relationshipEdges"],
): number | null {
  let best: number | null = null;
  const anchorIds = new Set(anchors.map((a) => a.id));

  for (const edge of edges) {
    if (edge.fromId !== node.id && edge.toId !== node.id) continue;
    if (edge.kind !== "nearby" && edge.kind !== "route") continue;
    const otherId = edge.fromId === node.id ? edge.toId : edge.fromId;
    if (!anchorIds.has(otherId)) continue;
    if (edge.meters != null && Number.isFinite(edge.meters)) {
      best = best == null ? edge.meters : Math.min(best, edge.meters);
    }
  }

  for (const anchor of anchors) {
    if (anchor.id === node.id) continue;
    const m = haversineMeters(node, anchor);
    best = best == null ? m : Math.min(best, m);
  }
  return best;
}

function scorePrice(
  node: ContextWorkspaceNode,
  peers: readonly ContextWorkspaceNode[],
): number {
  const prices = peers
    .map(parsePriceWon)
    .filter((p): p is number => p != null);
  const mine = parsePriceWon(node);
  if (mine == null || prices.length === 0) {
    return clamp01((node.rating ?? 3.5) / 5);
  }
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (max <= min) return 0.85;
  return clamp01(1 - (mine - min) / (max - min));
}

function scoreLocation(
  node: ContextWorkspaceNode,
  state: ContextWorkspaceState,
  anchors: readonly ContextWorkspaceNode[],
): number {
  const meters = minMetersToAnchors(node, anchors, state.relationshipEdges);
  if (meters == null) {
    return clamp01((node.rating ?? 3.5) / 5) * 0.7 + 0.15;
  }
  return clamp01(1 - meters / 3000);
}

function scoreScheduleFit(
  node: ContextWorkspaceNode,
  state: ContextWorkspaceState,
  anchors: readonly ContextWorkspaceNode[],
): number {
  const draft = state.realityDraft;
  if (!draft?.days?.length) {
    let s = 0.55;
    if (node.bookmarked || node.selected) s += 0.15;
    const m = minMetersToAnchors(node, anchors, state.relationshipEdges);
    if (m != null && m < 1500) s += 0.2;
    return clamp01(s);
  }

  let bestDay: number | null = null;
  for (const day of draft.days) {
    if (day.nodes.some((n) => n.nodeId === node.id)) {
      bestDay = day.day;
      break;
    }
  }

  const attractionDays = draft.days.filter((d) =>
    d.nodes.some((n) => {
      const ent = state.nodes.find((x) => x.id === n.nodeId);
      return ent
        ? isAttractionLike(ent)
        : /usj|유니버설|theme/i.test(n.title);
    }),
  );

  let s = 0.5;
  if (bestDay != null) {
    s += 0.25;
    if (attractionDays.some((d) => d.day === bestDay)) s += 0.2;
  } else {
    const m = minMetersToAnchors(node, anchors, state.relationshipEdges);
    if (m != null && m < 2000) s += 0.25;
    if (m != null && m < 800) s += 0.15;
  }
  if (node.bookmarked) s += 0.05;
  return clamp01(s);
}

function buildRelationshipsForEntity(
  entityId: string,
  state: ContextWorkspaceState,
  candidateIds: readonly string[],
): CompareDecisionRelationship[] {
  const candidateSet = new Set(candidateIds);
  const out: CompareDecisionRelationship[] = [];
  for (const e of state.relationshipEdges) {
    if (e.fromId !== entityId && e.toId !== entityId) continue;
    const other = e.fromId === entityId ? e.toId : e.fromId;
    const relevant =
      e.kind === "compare" ||
      candidateSet.has(other) ||
      e.kind === "route" ||
      e.kind === "nearby";
    if (!relevant) continue;
    out.push({
      id: e.id,
      fromEntityId: e.fromId,
      toEntityId: e.toId,
      kind: e.kind,
      labelKo: e.labelKo,
      meters: e.meters,
    });
    if (out.length >= 8) break;
  }
  return out;
}

function minutesLabel(meters: number | null): string | null {
  if (meters == null || !Number.isFinite(meters)) return null;
  const min = Math.max(1, Math.round(meters / 80));
  return `${min}분`;
}

function buildJudgmentKo(input: {
  readonly node: ContextWorkspaceNode;
  readonly scores: DecisionProjectionScores;
  readonly anchors: readonly ContextWorkspaceNode[];
  readonly state: ContextWorkspaceState;
}): string {
  const { node, scores, anchors, state } = input;
  const top =
    scores.location >= scores.scheduleFit && scores.location >= scores.price
      ? "location"
      : scores.scheduleFit >= scores.price
        ? "scheduleFit"
        : "price";

  const anchor = anchors[0];
  const meters = anchor
    ? minMetersToAnchors(node, [anchor], state.relationshipEdges)
    : null;
  const walk = minutesLabel(meters);

  const dayHint = state.realityDraft?.days.find((d) =>
    d.nodes.some((n) => {
      const ent = state.nodes.find((x) => x.id === n.nodeId);
      return ent ? isAttractionLike(ent) : false;
    }),
  );

  if (top === "scheduleFit" && dayHint) {
    const attr = dayHint.nodes.find((n) => {
      const ent = state.nodes.find((x) => x.id === n.nodeId);
      return ent ? isAttractionLike(ent) : /usj|유니버설/i.test(n.title);
    });
    if (attr) {
      return `${dayHint.day}일차 ${attr.title} 방문 후 이동 최소`;
    }
    return `${dayHint.day}일차 일정과 동선이 맞음`;
  }
  if (top === "location" && anchor && walk) {
    return `${anchor.title}까지 이동 ${walk} · 동선 부담 최소`;
  }
  if (top === "price") {
    return "가격은 저렴하지만 이동 증가";
  }
  if (scores.total >= 88) {
    return "Context 기준 최우선 후보";
  }
  if (scores.location < 0.45) {
    return "가격은 저렴하지만 이동 증가";
  }
  return node.summaryKo.trim() || "Context 적합도 보통";
}

function toScores(
  price: number,
  location: number,
  scheduleFit: number,
  weights: CompareDecisionCriteriaWeights,
): DecisionProjectionScores {
  const w = normalizeWeights(weights);
  const total01 = clamp01(
    price * w.price + location * w.location + scheduleFit * w.scheduleFit,
  );
  return {
    price: Math.round(price * 1000) / 1000,
    location: Math.round(location * 1000) / 1000,
    scheduleFit: Math.round(scheduleFit * 1000) / 1000,
    total: Math.round(total01 * 100),
  };
}

/**
 * Build one Decision Projection for a candidate entity.
 */
export function buildDecisionProjection(input: {
  readonly entityId: string;
  readonly state: ContextWorkspaceState;
  readonly weights?: CompareDecisionCriteriaWeights;
  readonly candidateEntityIds?: readonly string[];
}): DecisionProjection | null {
  const state = input.state;
  const node = state.nodes.find((n) => n.id === input.entityId);
  if (!node) return null;

  const candidateEntityIds =
    input.candidateEntityIds ??
    (state.compareIds.length >= 2 ? state.compareIds : [node.id]);
  const peers = candidateEntityIds
    .map((id) => state.nodes.find((n) => n.id === id))
    .filter((n): n is ContextWorkspaceNode => n != null);

  const weights = normalizeWeights(
    input.weights ?? resolveCompareCriteriaWeights(state),
  );
  const anchors = contextAnchors(state);

  const price = scorePrice(node, peers);
  const location = scoreLocation(node, state, anchors);
  const scheduleFit = scoreScheduleFit(node, state, anchors);
  const scores = toScores(price, location, scheduleFit, weights);

  return {
    mode: "compare_decision",
    entityId: node.id,
    titleKo: node.title,
    imageUrl:
      node.thumbnailUrl?.trim() ||
      node.galleryUrls?.find((u) => u.trim())?.trim() ||
      null,
    scores,
    weights,
    judgmentKo: buildJudgmentKo({ node, scores, anchors, state }),
    relationships: buildRelationshipsForEntity(
      node.id,
      state,
      candidateEntityIds,
    ),
    actions: ["select"],
  };
}

/**
 * Promote Compare Preview → Decision Projection list (Context-weighted).
 * Replaces list-card semantics of buildNodePreviewsForCompare for Compare Mode.
 */
export function buildDecisionProjectionsForCompare(
  state: ContextWorkspaceState,
  weights?: CompareDecisionCriteriaWeights,
): readonly DecisionProjection[] {
  const w = weights ?? resolveCompareCriteriaWeights(state);
  const ids = state.compareIds.slice(0, 5);
  const out: DecisionProjection[] = [];
  for (const id of ids) {
    const d = buildDecisionProjection({
      entityId: id,
      state,
      weights: w,
      candidateEntityIds: ids,
    });
    if (d) out.push(d);
  }
  return [...out].sort((a, b) => b.scores.total - a.scores.total);
}
