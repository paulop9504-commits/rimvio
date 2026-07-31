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
import {
  resolveWorkspaceNodeCapabilities,
  workspaceNodeCanPrepare,
} from "@/lib/context-workspace/resolve-workspace-node-capabilities";
import type { RealityExecutionCapability } from "@/lib/reality-object/types";

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
  /** Gallery including hero — Peek swipe / strip. */
  readonly galleryImages: readonly string[];
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
  readonly canPrepare: boolean;
  /** ADR-018 capabilities — Peek CTAs prefer this over kind forks. */
  readonly capabilities: readonly RealityExecutionCapability[];
};

function formatPrice(node: ContextWorkspaceNode): string {
  if (node.amountLabel?.trim()) return node.amountLabel.trim();
  if (node.priceBand != null) {
    return `${"₩".repeat(Math.min(4, Math.max(1, node.priceBand)))}`;
  }
  return "가격 미정";
}

function formatRating(rating: number | null): string {
  if (rating == null || !Number.isFinite(rating)) return "평점 —";
  return `★ ${rating.toFixed(1)}`;
}

function formatReviewSummary(node: ContextWorkspaceNode): string {
  const count = node.reviewCount;
  if (typeof count === "number" && Number.isFinite(count) && count > 0) {
    return `후기 ${count.toLocaleString("ko-KR")}`;
  }
  if (node.rating != null && Number.isFinite(node.rating)) {
    return "평점 있음";
  }
  return "후기 없음";
}

function amenityChips(node: ContextWorkspaceNode): readonly string[] {
  const TAG_KO: Record<string, string> = {
    reservable: "예약 가능",
    lodging: "숙소",
    stay: "숙박",
    local_favorite: "현지 추천",
    live_burst: "후보",
    rain_safe: "실내·우천",
    indoor: "실내",
  };
  const out: string[] = [];
  if (node.kind === "lodging") {
    out.push("숙소 · 동선 중심");
  }
  for (const raw of node.tags) {
    const t = raw.trim();
    if (!t) continue;
    if (
      /^(photo_spot|lodging|eatery|poi|amenity|day_\d+|part_|cluster_|source_|ws-)/iu.test(
        t,
      )
    ) {
      continue;
    }
    const label = TAG_KO[t] ?? (/^[a-z0-9_:-]+$/iu.test(t) ? null : t);
    if (label && !out.includes(label)) out.push(label);
    if (out.length >= 4) break;
  }
  if (node.kind === "lodging" && !out.some((x) => /예약/u.test(x))) {
    out.push("예약 가능");
  }
  return out.slice(0, 4);
}

function lodgingWhyChosen(node: ContextWorkspaceNode): string {
  const bits: string[] = [];
  if (node.summaryKo.trim()) bits.push(node.summaryKo.trim());
  if (node.amountLabel?.trim()) bits.push(node.amountLabel.trim());
  if (node.rating != null && Number.isFinite(node.rating)) {
    bits.push(`평점 ${node.rating.toFixed(1)}`);
  }
  if (typeof node.reviewCount === "number" && node.reviewCount > 0) {
    bits.push(`후기 ${node.reviewCount.toLocaleString("ko-KR")}개`);
  }
  if (bits.length === 0) {
    return `${domainLabelKo(node.kind)} 후보 · ${formatPrice(node)}`;
  }
  return bits.slice(0, 3).join(" · ");
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

  // No invented nearby chips — only live relationship edges.
  const why =
    node.kind === "lodging"
      ? lodgingWhyChosen(node)
      : node.summaryKo.trim() ||
        `${domainLabelKo(node.kind)} 후보 · ${formatPrice(node)}`;

  const reviewSummary = formatReviewSummary(node);

  const galleryRaw = [
    node.thumbnailUrl?.trim() || null,
    ...(node.galleryUrls ?? []).map((u) => u.trim()),
  ].filter((u): u is string => Boolean(u));
  const galleryImages = [...new Set(galleryRaw)].slice(0, 8);
  const heroImage = galleryImages[0] ?? null;

  const capabilities = resolveWorkspaceNodeCapabilities(node);

  return {
    nodeId: node.id,
    kind: node.kind,
    title: node.title,
    kindLabelKo: domainLabelKo(node.kind),
    heroImage,
    galleryImages,
    imageCountHint: galleryImages.length,
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
    canPrepare: workspaceNodeCanPrepare(capabilities),
    capabilities,
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
