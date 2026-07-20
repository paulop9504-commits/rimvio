/**
 * After Action Planner compare — start Context Bloom on the compare pair.
 */

import { readSessionGraph } from "@/lib/graph-command/session-graph-store";
import type { SessionGraphNode } from "@/lib/graph-command/types";
import { startContextBloom } from "@/lib/visual-projection/context-bloom-store";
import type { ContextBloomCandidate } from "@/lib/visual-projection/context-bloom-types";

function pinKindFor(
  kind: SessionGraphNode["kind"],
): ContextBloomCandidate["pinKind"] {
  if (kind === "lodging" || kind === "eatery") {
    return kind;
  }
  return "amenity";
}

function toBloomCandidate(node: SessionGraphNode): ContextBloomCandidate | null {
  if (node.lat == null || node.lng == null) {
    return null;
  }
  if (node.kind === "compare" || node.kind === "note" || node.kind === "group") {
    return null;
  }
  return {
    id: node.id,
    resourceId:
      typeof node.attrs.searchId === "string"
        ? node.attrs.searchId
        : typeof node.attrs.realityObjectId === "string"
          ? node.attrs.realityObjectId
          : node.id,
    label: node.labelKo,
    lat: node.lat,
    lng: node.lng,
    pinKind: pinKindFor(node.kind),
    placeId:
      typeof node.attrs.googlePlaceId === "string"
        ? node.attrs.googlePlaceId
        : node.id,
  };
}

/**
 * Bloom the two compare targets (or selection) so Globe shows related arcs.
 */
export function triggerCompareBloomFromSessionGraph(
  contextEventId: string,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const graph = readSessionGraph(contextEventId);
  if (!graph) {
    return false;
  }

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const pairIds: string[] = [];
  for (const edge of graph.edges) {
    if (edge.kind !== "compare") {
      continue;
    }
    const from = byId.get(edge.fromId);
    const to = byId.get(edge.toId);
    if (!from || !to) {
      continue;
    }
    if (from.kind === "compare" || to.kind === "compare") {
      continue;
    }
    pairIds.push(from.id, to.id);
    break;
  }

  const selection =
    pairIds.length >= 2
      ? pairIds
      : graph.selectionIds.length >= 2
        ? [...graph.selectionIds]
        : graph.nodes.filter((n) => n.pinned).map((n) => n.id);

  const unique = [...new Set(selection)];
  const candidates = unique
    .map((id) => byId.get(id))
    .filter((n): n is SessionGraphNode => Boolean(n))
    .map(toBloomCandidate)
    .filter((c): c is ContextBloomCandidate => Boolean(c));

  if (candidates.length < 2) {
    return false;
  }

  startContextBloom({
    selected: candidates[0]!,
    candidates,
    maxRelated: 4,
  });
  return true;
}
