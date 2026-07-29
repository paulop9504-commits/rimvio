/**
 * Lightweight Preview adapter — unify lodging/eatery node data for Peek/Compare.
 * Does not invent a new app-wide model; projects from ContextWorkspaceNode + edges.
 */

import type {
  ContextWorkspaceNode,
  ContextWorkspaceRelationshipEdge,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";
import { domainLabelKo } from "@/lib/context-workspace/types";

export type NodePreviewNearbyChip = {
  readonly kind: "eatery" | "cafe" | "poi" | "amenity" | "route" | "other";
  readonly labelKo: string;
  readonly meters: number | null;
};

export type NodePreviewModel = {
  readonly nodeId: string;
  readonly kind: ContextWorkspaceNode["kind"];
  readonly title: string;
  readonly kindLabelKo: string;
  readonly heroImage: string | null;
  readonly imageCountHint: number;
  readonly rating: number | null;
  readonly ratingLabel: string;
  readonly price: string;
  readonly reviewSummary: string;
  readonly whyChosen: string;
  readonly amenities: readonly string[];
  readonly nearby: readonly NodePreviewNearbyChip[];
  readonly selected: boolean;
  readonly bookmarked: boolean;
  readonly inCompare: boolean;
};

function formatPrice(node: ContextWorkspaceNode): string {
  if (node.amountLabel?.trim()) return node.amountLabel.trim();
  if (node.priceBand != null) {
    if (node.priceBand <= 1) return "저렴";
    if (node.priceBand === 2) return "보통";
    if (node.priceBand === 3) return "다소 비쌈";
    return "고급";
  }
  return "가격 미정";
}

function formatRating(rating: number | null): string {
  if (rating == null || !Number.isFinite(rating)) return "평점 —";
  return `★ ${rating.toFixed(1)}`;
}

function amenityChips(node: ContextWorkspaceNode): readonly string[] {
  const fromTags = node.tags
    .filter((t) => !/photo_spot|lodging|eatery|poi|amenity/i.test(t))
    .slice(0, 4)
    .map((t) => t.replace(/_/g, " "));
  if (fromTags.length > 0) return fromTags;
  if (node.kind === "lodging") return ["위치", "후기", "가격"];
  if (node.kind === "eatery") return ["대표메뉴", "대기", "영업"];
  return [domainLabelKo(node.kind)];
}

function inferNearbyKind(
  other: ContextWorkspaceNode | undefined,
  labelKo: string,
): NodePreviewNearbyChip["kind"] {
  if (other?.kind === "eatery") {
    if (/카페|coffee|cafe/i.test(`${other.title} ${labelKo}`)) return "cafe";
    return "eatery";
  }
  if (other?.kind === "poi") return "poi";
  if (other?.kind === "amenity") return "amenity";
  if (/카페|cafe/i.test(labelKo)) return "cafe";
  if (/맛집|식당|초밥|음식/i.test(labelKo)) return "eatery";
  return "other";
}

function nearbyIcon(kind: NodePreviewNearbyChip["kind"]): string {
  switch (kind) {
    case "eatery":
      return "🍣";
    case "cafe":
      return "☕";
    case "poi":
      return "🏖";
    case "amenity":
      return "🏪";
    case "route":
      return "🚗";
    default:
      return "📍";
  }
}

function formatMeters(meters: number | null): string | null {
  if (meters == null || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.max(1, Math.round(meters))}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function buildNodePreview(
  node: ContextWorkspaceNode,
  state: Pick<
    ContextWorkspaceState,
    "nodes" | "relationshipEdges" | "compareIds" | "selectedIds"
  >,
): NodePreviewModel {
  const edges = state.relationshipEdges.filter(
    (e) =>
      (e.fromId === node.id || e.toId === node.id) &&
      (e.kind === "nearby" || e.kind === "route"),
  );

  const nearby: NodePreviewNearbyChip[] = [];
  const seen = new Set<string>();
  for (const edge of edges) {
    const otherId = edge.fromId === node.id ? edge.toId : edge.fromId;
    if (seen.has(otherId)) continue;
    seen.add(otherId);
    const other = state.nodes.find((n) => n.id === otherId);
    const kind = edge.kind === "route" ? "route" : inferNearbyKind(other, edge.labelKo);
    const metersLabel = formatMeters(edge.meters);
    const base = other?.title?.trim() || edge.labelKo;
    nearby.push({
      kind,
      labelKo: metersLabel
        ? `${nearbyIcon(kind)} ${base} ${metersLabel}`
        : `${nearbyIcon(kind)} ${base}`,
      meters: edge.meters,
    });
    if (nearby.length >= 4) break;
  }

  // Domain fallback chips when graph has no nearby edges yet
  if (nearby.length === 0) {
    if (node.kind === "lodging") {
      nearby.push(
        { kind: "eatery", labelKo: "🍣 주변 맛집", meters: null },
        { kind: "cafe", labelKo: "☕ 주변 카페", meters: null },
        { kind: "poi", labelKo: "🏖 관광·명소", meters: null },
      );
    } else if (node.kind === "eatery") {
      nearby.push(
        { kind: "amenity", labelKo: "🏪 편의점", meters: null },
        { kind: "route", labelKo: "🚗 이동", meters: null },
      );
    }
  }

  const why =
    node.summaryKo.trim() ||
    `${domainLabelKo(node.kind)} 후보 · ${formatPrice(node)}`;

  const reviewSummary =
    node.rating != null && Number.isFinite(node.rating)
      ? node.rating >= 4.5
        ? "후기 상위권"
        : node.rating >= 4.0
          ? "좋은 후기"
          : "보통 후기"
      : "후기 수집 중";

  return {
    nodeId: node.id,
    kind: node.kind,
    title: node.title,
    kindLabelKo: domainLabelKo(node.kind),
    heroImage: node.thumbnailUrl,
    imageCountHint: node.thumbnailUrl ? 5 : 0,
    rating: node.rating,
    ratingLabel: formatRating(node.rating),
    price: formatPrice(node),
    reviewSummary,
    whyChosen: why,
    amenities: amenityChips(node),
    nearby,
    selected: node.selected || state.selectedIds.includes(node.id),
    bookmarked: node.bookmarked,
    inCompare: state.compareIds.includes(node.id),
  };
}

export function buildNodePreviewsForCompare(
  state: ContextWorkspaceState,
): readonly NodePreviewModel[] {
  return state.compareIds
    .map((id) => state.nodes.find((n) => n.id === id))
    .filter((n): n is ContextWorkspaceNode => n != null)
    .slice(0, 5)
    .map((n) => buildNodePreview(n, state));
}

export type { ContextWorkspaceRelationshipEdge };
