/**
 * Commit Workspace → Globe (persistent Diff + session graph place nodes).
 * Any map domain: lodging · eatery · poi · amenity.
 */

import { applyWorkspaceTransition } from "@/lib/context-workspace/apply-workspace-transition";
import type {
  ContextWorkspaceDomain,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";
import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import { stampSearchToolResultsToDiff } from "@/lib/graph-command/stamp-search-tool-results-to-diff";
import {
  ensureSessionGraph,
  writeSessionGraph,
} from "@/lib/graph-command/session-graph-store";
import { bumpSessionGraphProjection } from "@/lib/graph-command/bump-session-graph-projection";
import type {
  GraphEntityDomain,
  SessionGraphNode,
  SessionGraphNodeKind,
} from "@/lib/graph-command/types";

function placeCommitNode(input: {
  contextEventId: string;
  domain: ContextWorkspaceDomain;
  placeId: string;
  title: string;
  lat: number;
  lng: number;
  rating: number | null;
  priceBand: number | null;
  index: number;
}): SessionGraphNode {
  const kind = input.domain as SessionGraphNodeKind;
  return {
    id: `gnode:${input.contextEventId}:${input.domain}:${input.placeId.slice(0, 24)}`,
    labelKo: input.title,
    kind,
    lat: input.lat,
    lng: input.lng,
    rating: input.rating,
    walkMinutes: null,
    reservable: false,
    localFavorite: false,
    priceBand: input.priceBand,
    pinned: input.index === 0,
    visible: true,
    alwaysVisible: false,
    parentId: null,
    groupId: null,
    accent: input.index === 0 ? "orange" : "default",
    projectFolderKo: null,
    attrs: {
      placeId: input.placeId,
      workspaceCommit: true,
      rank: input.index + 1,
    },
  };
}

export function commitContextWorkspaceToGlobe(input: {
  contextEventId: string;
  nodeIds?: readonly string[] | null;
}): {
  ok: boolean;
  state: ContextWorkspaceState | null;
  committedCount: number;
} {
  const contextEventId = input.contextEventId.trim();
  const state = readContextWorkspace(contextEventId);
  if (!state || state.status === "closed") {
    return { ok: false, state: null, committedCount: 0 };
  }

  applyWorkspaceTransition({ contextEventId, op: "commit" });

  const live = readContextWorkspace(contextEventId);
  if (!live) {
    return { ok: false, state: null, committedCount: 0 };
  }

  const idSet = new Set(
    (input.nodeIds ?? live.selectedIds).map((id) => id.trim()).filter(Boolean),
  );
  let nodes = live.nodes.filter((n) => n.visible);
  if (idSet.size > 0) {
    nodes = nodes.filter((n) => idSet.has(n.id) || idSet.has(n.placeId));
  }
  if (nodes.length === 0) {
    nodes = live.nodes.filter((n) => n.visible).slice(0, 8);
  }

  const stampDomain: GraphEntityDomain =
    live.domain === "eatery"
      ? "eatery"
      : live.domain === "lodging"
        ? "lodging"
        : "poi";

  stampSearchToolResultsToDiff({
    contextEventId,
    domain: stampDomain,
    query: live.query,
    candidates: nodes.map((n) => ({
      id: n.placeId,
      labelKo: n.title,
      lat: n.lat,
      lng: n.lng,
      rating: n.rating,
      priceBand: n.priceBand,
      amountLabel: n.amountLabel,
      source:
        n.source === "liteapi" ||
        n.source === "seed" ||
        n.source === "review" ||
        n.source === "booking"
          ? n.source
          : "maps",
    })),
    summaryKo: `${nodes.length}곳 지구에 남겼어요`,
    batchId: `workspace-commit:${live.workspaceId}`,
  });

  const graph = ensureSessionGraph({ contextEventId });
  const placeNodes = nodes.map((n, index) =>
    placeCommitNode({
      contextEventId,
      domain: n.kind,
      placeId: n.placeId,
      title: n.title,
      lat: n.lat,
      lng: n.lng,
      rating: n.rating,
      priceBand: n.priceBand,
      index,
    }),
  );
  const hideKinds = new Set(placeNodes.map((n) => n.kind));
  const kept = graph.nodes.filter((n) => !hideKinds.has(n.kind));
  writeSessionGraph({
    ...graph,
    nodes: [...kept, ...placeNodes],
    selectionIds: placeNodes.slice(0, 1).map((n) => n.id),
    updatedAtIso: new Date().toISOString(),
  });
  bumpSessionGraphProjection(contextEventId);

  const committed: ContextWorkspaceState = {
    ...live,
    status: "committed",
    committedAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
    lastChangeKo: `${nodes.length}곳 지구에 남겼어요`,
    summaryKo: `${nodes.length}곳 커밋됨`,
    selectedIds: nodes.map((n) => n.id),
    lastWhy: {
      actionKo: "Reality Commit",
      reasonsKo: ["사용자가 Swipe로 승인"],
      impactsKo: [`${nodes.length}곳 Globe Forest에 반영`],
      nodeIds: nodes.map((n) => n.id),
      atIso: new Date().toISOString(),
    },
    nodes: live.nodes.map((n) => ({
      ...n,
      selected: nodes.some((c) => c.id === n.id),
    })),
  };
  writeContextWorkspace(committed);

  return { ok: true, state: committed, committedCount: nodes.length };
}

/** @deprecated use commitContextWorkspaceToGlobe */
export function commitLodgingWorkspaceToGlobe(input: {
  contextEventId: string;
  nodeIds?: readonly string[] | null;
}): {
  ok: boolean;
  state: ContextWorkspaceState | null;
  committedCount: number;
} {
  return commitContextWorkspaceToGlobe(input);
}
