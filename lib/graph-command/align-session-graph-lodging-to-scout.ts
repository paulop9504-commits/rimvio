/**
 * After a Field scout, remove stale session-graph lodging/eatery nodes
 * so graph markers match the discovery batch (Cursor-style open files).
 */

import {
  readSessionGraph,
  writeSessionGraph,
} from "@/lib/graph-command/session-graph-store";
import type { SessionGraphNode, SessionGraphV1 } from "@/lib/graph-command/types";

function isUserPinnedPlace(node: SessionGraphNode): boolean {
  return (
    (node.kind === "lodging" || node.kind === "eatery" || node.kind === "poi") &&
    (node.pinned === true || node.alwaysVisible === true)
  );
}

function nodeMatchesScoutKeep(
  node: SessionGraphNode,
  keepIds: ReadonlySet<string>,
  keepLabels: ReadonlySet<string>,
): boolean {
  const catalogId =
    typeof node.attrs?.catalogId === "string" ? node.attrs.catalogId : "";
  const searchId =
    typeof node.attrs?.searchId === "string" ? node.attrs.searchId : "";
  if (keepIds.has(node.id) || keepIds.has(catalogId) || keepIds.has(searchId)) {
    return true;
  }
  if (keepLabels.has(node.labelKo.trim().toLowerCase())) {
    return true;
  }
  return false;
}

/**
 * Drop non-pinned lodging graph nodes that are not in the scout place set.
 * Keeps eatery/compare/notes. Returns next graph or null if unchanged / missing.
 */
export function alignSessionGraphLodgingToScout(input: {
  contextEventId: string;
  /** Place ids / labels from the active discovery batch. */
  scoutPlaceIds: readonly string[];
  scoutLabelsKo?: readonly string[];
}): SessionGraphV1 | null {
  return alignSessionGraphDiscoveryToScout({
    ...input,
    kinds: ["lodging"],
  });
}

/** Align lodging and/or eatery nodes to the active scout batch. */
export function alignSessionGraphDiscoveryToScout(input: {
  contextEventId: string;
  scoutPlaceIds: readonly string[];
  scoutLabelsKo?: readonly string[];
  kinds?: readonly SessionGraphNode["kind"][];
}): SessionGraphV1 | null {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return null;
  }
  const graph = readSessionGraph(contextEventId);
  if (!graph) {
    return null;
  }

  const kinds = new Set(input.kinds ?? ["lodging", "eatery"]);
  const keepIds = new Set(
    input.scoutPlaceIds.map((id) => id.trim()).filter(Boolean),
  );
  const keepLabels = new Set(
    (input.scoutLabelsKo ?? [])
      .map((label) => label.trim().toLowerCase())
      .filter(Boolean),
  );

  const nextNodes = graph.nodes.filter((node) => {
    if (!kinds.has(node.kind)) {
      return true;
    }
    if (isUserPinnedPlace(node)) {
      return true;
    }
    if (keepIds.size === 0 && keepLabels.size === 0) {
      return false;
    }
    return nodeMatchesScoutKeep(node, keepIds, keepLabels);
  });

  if (nextNodes.length === graph.nodes.length) {
    return null;
  }

  const nextSelection = graph.selectionIds.filter((id) =>
    nextNodes.some((node) => node.id === id),
  );
  const next: SessionGraphV1 = {
    ...graph,
    nodes: nextNodes,
    selectionIds: nextSelection,
    updatedAtIso: new Date().toISOString(),
  };
  writeSessionGraph(next);
  return next;
}
