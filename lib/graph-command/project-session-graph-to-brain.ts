/**
 * Session graph → dashed BrainSurfaceProjectionCandidate for globe markers.
 * Search Diff nodes with Reality Object attrs project as working-set markers.
 */

import type { GraphPinAccent, SessionGraphV1 } from "@/lib/graph-command/types";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";
import type { ProjectionDiscoveryAccent } from "@/lib/situation-projection/projection-node-presentation";

function mapAccent(
  accent: GraphPinAccent,
  family: BrainSurfaceProjectionCandidate["family"],
): ProjectionDiscoveryAccent {
  if (accent === "red") {
    return "orange";
  }
  if (accent === "blue") {
    return "blue";
  }
  if (accent === "green") {
    return "green";
  }
  if (accent === "orange") {
    return "orange";
  }
  return family === "lodging"
    ? "blue"
    : family === "eatery"
      ? "orange"
      : "green";
}

export function projectSessionGraphToBrainCandidates(
  graph: SessionGraphV1,
): readonly BrainSurfaceProjectionCandidate[] {
  const out: BrainSurfaceProjectionCandidate[] = [];
  let order = 40;
  const mainId = graph.selectionIds[0] ?? null;
  for (const node of graph.nodes) {
    if (node.kind === "compare" || node.kind === "group" || node.kind === "note") {
      continue;
    }
    if (!node.visible && !node.alwaysVisible) {
      continue;
    }
    if (node.lat == null || node.lng == null) {
      continue;
    }
    // Skip null-island placeholders from missing tool coords.
    if (node.lat === 0 && node.lng === 0) {
      continue;
    }
    const family =
      node.kind === "lodging"
        ? "lodging"
        : node.kind === "eatery"
          ? "eatery"
          : node.kind === "anchor"
            ? "trace_place"
            : "trace_place";
    const solid = node.pinned || node.alwaysVisible || node.kind === "anchor";
    const realityObjectId =
      typeof node.attrs.realityObjectId === "string"
        ? node.attrs.realityObjectId.trim()
        : "";
    const planDayIndex =
      typeof node.attrs.planDayIndex === "number" && node.attrs.planDayIndex >= 1
        ? node.attrs.planDayIndex
        : null;
    const isMain =
      node.attrs.isMain === true ||
      (mainId != null && node.id === mainId && node.kind !== "anchor");
    const badgeLabelKo = solid
      ? node.kind === "anchor"
        ? "목적지"
        : "고정"
      : planDayIndex != null
        ? `${planDayIndex}일차`
        : isMain
          ? "MAIN"
          : "근처";
    out.push({
      id: `brain-surface:${graph.contextEventId}:gcmd:${node.id}`,
      eventId: graph.contextEventId,
      nodeId: null,
      family,
      clusterId: `gcmd:${graph.contextEventId}`,
      parentGuideNodeId: null,
      anchorKind: "inferred_place",
      markerStyle: solid ? "solid" : "dashed",
      confidence: node.rating != null ? Math.min(0.95, node.rating / 5) : 0.7,
      confidenceLabelKo: node.rating != null ? `${node.rating}` : null,
      inferenceLabelKo: solid
        ? node.kind === "anchor"
          ? "목적지"
          : "고정"
        : isMain
          ? "MAIN"
          : realityObjectId
            ? "후보"
            : "탐색",
      focusAffinityFamilies: [family, "trace_place", "info"],
      label: node.labelKo,
      previewTitle: node.labelKo,
      previewBody:
        planDayIndex != null
          ? `${planDayIndex}일차`
          : node.walkMinutes != null
            ? `도보 ${node.walkMinutes}분`
            : null,
      placeLabel: node.labelKo,
      lat: node.lat,
      lng: node.lng,
      accent: mapAccent(node.accent, family),
      badgeLabelKo,
      relationMemoKo: null,
      sourceLabelKo: realityObjectId ? "오브젝트" : "맥락",
      validityLabelKo: null,
      evidenceKind: "projection",
      primaryActionLabelKo: "열기",
      openUrl: null,
      embedUrl: null,
      mapsUrl: null,
      searchQuery: node.labelKo,
      sourceGuideNodeId: realityObjectId || null,
      revealOrder: isMain ? 1 : order++,
      virtualCandidate: true,
      memoCommitDraft: null,
    });
  }
  return out;
}
