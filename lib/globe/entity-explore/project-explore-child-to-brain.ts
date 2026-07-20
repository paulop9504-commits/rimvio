/**
 * Explore / AI-next pick → dashed BrainSurfaceProjectionCandidate on the globe.
 */

import type { PlaceExploreEntity, PlaceExploreGraphNode } from "@/lib/globe/entity-explore/types";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

function orbitOffset(input: {
  lat: number;
  lng: number;
  index: number;
  radiusKm: number;
}): { lat: number; lng: number } {
  const angle = 40 + input.index * 48;
  const rad = (angle * Math.PI) / 180;
  const latOffset = (input.radiusKm / 111) * Math.cos(rad);
  const lngScale = Math.max(0.25, Math.cos((input.lat * Math.PI) / 180));
  const lngOffset = (input.radiusKm / (111 * lngScale)) * Math.sin(rad);
  return {
    lat: input.lat + latOffset,
    lng: input.lng + lngOffset,
  };
}

function familyForExplore(
  exploreId: string | undefined,
): BrainSurfaceProjectionCandidate["family"] {
  if (exploreId === "nearby_eatery" || exploreId === "picnic") {
    return "eatery";
  }
  if (exploreId === "nearby_cafe") {
    return "eatery";
  }
  if (exploreId === "shopping") {
    return "info";
  }
  return "trace_place";
}

function accentForFamily(
  family: BrainSurfaceProjectionCandidate["family"],
): BrainSurfaceProjectionCandidate["accent"] {
  if (family === "eatery") {
    return "orange";
  }
  if (family === "lodging") {
    return "blue";
  }
  return "green";
}

/**
 * Project one Explore (or AI-next explore) node as a dashed map child.
 * Uses orbit coords from parent place — real search can fill later.
 */
export function projectExploreChildToBrain(input: {
  entity: PlaceExploreEntity;
  node: PlaceExploreGraphNode;
  eventId: string;
  index?: number;
  revealOrder?: number;
}): BrainSurfaceProjectionCandidate | null {
  if (!input.node.projectable && !input.node.exploreId) {
    return null;
  }
  const exploreId = input.node.exploreId;
  if (!exploreId) {
    return null;
  }
  const index = input.index ?? 0;
  const coords = orbitOffset({
    lat: input.entity.lat,
    lng: input.entity.lng,
    index,
    radiusKm: 0.55 + index * 0.12,
  });
  const family = familyForExplore(exploreId);
  const eventId = input.eventId.trim() || "evt-explore";
  const candidateId = `brain-surface:${eventId}:explore:${input.entity.placeId}:${exploreId}`;

  return {
    id: candidateId,
    eventId,
    nodeId: null,
    family,
    clusterId: `explore:${input.entity.placeId}`,
    parentGuideNodeId: null,
    anchorKind: "inferred_place",
    markerStyle: "dashed",
    confidence: 0.72,
    confidenceLabelKo: "72%",
    inferenceLabelKo: "AI 탐색",
    spatialTraceItems: undefined,
    focusAffinityFamilies: ["trace_place", family, "info"],
    label: input.node.labelKo,
    previewTitle: input.node.labelKo,
    previewBody: input.node.detailKo,
    placeLabel: input.node.labelKo,
    lat: coords.lat,
    lng: coords.lng,
    accent: accentForFamily(family),
    badgeLabelKo: "둘러보기",
    relationMemoKo: `${input.entity.titleKo} · ${input.node.labelKo}`,
    sourceLabelKo: "AI 탐색",
    validityLabelKo: "지도에 펼친 후보",
    evidenceKind: "projection",
    primaryActionLabelKo: "열기",
    openUrl: null,
    embedUrl: null,
    mapsUrl: null,
    searchQuery: `${input.entity.titleKo} ${input.node.labelKo}`,
    sourceGuideNodeId: null,
    revealOrder: input.revealOrder ?? 80 + index,
    markerThumbnailUrl: input.entity.thumbnailUrl,
    markerMediaKind: input.entity.thumbnailUrl ? "image" : null,
    virtualCandidate: true,
    memoCommitDraft: null,
  };
}
