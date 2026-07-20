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
          : "trace_place";
    const solid = node.pinned || node.alwaysVisible;
    const realityObjectId =
      typeof node.attrs.realityObjectId === "string"
        ? node.attrs.realityObjectId.trim()
        : "";
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
      inferenceLabelKo: solid ? "고정" : realityObjectId ? "후보" : "탐색",
      focusAffinityFamilies: [family, "trace_place", "info"],
      label: node.labelKo,
      previewTitle: node.labelKo,
      previewBody:
        node.walkMinutes != null ? `도보 ${node.walkMinutes}분` : null,
      placeLabel: node.labelKo,
      lat: node.lat,
      lng: node.lng,
      accent: mapAccent(node.accent, family),
      badgeLabelKo: solid ? "고정" : "근처",
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
      revealOrder: order++,
      virtualCandidate: true,
      memoCommitDraft: null,
    });
  }
  return out;
}
