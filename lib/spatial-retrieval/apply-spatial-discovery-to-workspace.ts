/**
 * SPATIAL_DISCOVERY Tool → Context Workspace Patch.
 * Reuses runSpatialRetrieval — no second Spatial Engine.
 */

import { applyWorkspaceTransition } from "@/lib/context-workspace/apply-workspace-transition";
import {
  readContextWorkspace,
  writeContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import { withWorkspaceRelationships } from "@/lib/context-workspace/sync-workspace-relationships";
import type {
  ContextWorkspaceDomain,
  ContextWorkspaceNode,
  ContextWorkspaceRelationshipEdge,
} from "@/lib/context-workspace/types";
import { runAutoProjectionAfterPatch } from "@/lib/context-workspace/auto-projection";
import { openCalloutWindowsFromAgent } from "@/lib/callout/windows";
import { parseSpatialDiscoveryIntent } from "@/lib/spatial-retrieval/intent-parser";
import { runSpatialRetrieval } from "@/lib/spatial-retrieval/run-spatial-retrieval";
import type { SpatialAnchorCandidate } from "@/lib/spatial-retrieval/anchor-resolver";
import type {
  SpatialRetrievedEntity,
  SpatialTargetEntity,
} from "@/lib/spatial-retrieval/types";
import type { SearchToolCandidate } from "@/lib/graph-command/stamp-search-tool-results-to-diff";
import { enrichDiscoveredObjects } from "@/lib/context-run/object-enrichment";
import { evaluateCandidateObjects } from "@/lib/context-run/candidate-evaluation";
import {
  advanceAgentProductStage,
  beginAgentProductTurn,
  readLastAgentProductTurn,
} from "@/lib/context-run/agent-product-pipeline";
import { writeAgentRuntimeProjectionFromWorkspace } from "@/lib/context-run/agent-runtime-projection";
import {
  ensureWorkspaceAnchorNode,
  gateNearScoutAnchor,
  isNearScoutUtterance,
  resolveRealityAnchorFromUtterance,
} from "@/lib/context-workspace/reality-anchor";

export type ApplySpatialDiscoveryToWorkspaceResult = {
  readonly handled: boolean;
  readonly statusKo: string | null;
  readonly entityCount: number;
  readonly relationCount: number;
  readonly calloutCount: number;
  readonly anchorTitleKo: string | null;
};

function domainFromTarget(target: SpatialTargetEntity): ContextWorkspaceDomain {
  if (target === "hotel") return "lodging";
  if (target === "restaurant" || target === "cafe") return "eatery";
  if (target === "amenity") return "amenity";
  return "poi";
}

function kindFromNode(node: ContextWorkspaceNode): string {
  if (node.kind === "lodging") return "hotel";
  if (node.kind === "eatery") return "restaurant";
  if (node.kind === "amenity") return "station";
  return "attraction";
}

/** Workspace nodes → Anchor Resolver candidates. */
export function workspaceNodesToSpatialCandidates(
  nodes: readonly ContextWorkspaceNode[],
): SpatialAnchorCandidate[] {
  return nodes
    .filter((n) => Number.isFinite(n.lat) && Number.isFinite(n.lng))
    .map((n) => ({
      entityId: n.id,
      titleKo: n.title,
      kind: kindFromNode(n),
      lat: n.lat,
      lng: n.lng,
      selected: n.selected,
      contextAnchor: n.bookmarked || n.selected,
    }));
}

function entityToSearchCandidate(
  e: SpatialRetrievedEntity,
): SearchToolCandidate {
  return {
    id: e.entityId,
    labelKo: e.titleKo,
    lat: e.lat,
    lng: e.lng,
    rating: e.rating ?? null,
    walkMinutes: e.walkMinutes ?? null,
    amountLabel: null,
    priceBand: null,
    source: "spatial_retrieval",
  } as SearchToolCandidate;
}

function mergeSpatialRelations(input: {
  readonly existing: readonly ContextWorkspaceRelationshipEdge[];
  readonly fromId: string;
  readonly toNodeIds: readonly string[];
  readonly metersByEntityId: ReadonlyMap<string, number | null>;
}): readonly ContextWorkspaceRelationshipEdge[] {
  const byId = new Map(input.existing.map((e) => [e.id, e]));
  for (const toId of input.toNodeIds) {
    const id = `spatial_nearby_${input.fromId}_${toId}`;
    const meters = input.metersByEntityId.get(toId) ?? null;
    byId.set(id, {
      id,
      kind: "nearby",
      fromId: input.fromId,
      toId,
      labelKo: meters != null ? `Nearby · ${meters}m` : "Nearby",
      meters,
    });
  }
  return [...byId.values()].slice(0, 64);
}

/**
 * Tool Router leaf: SPATIAL_DISCOVERY → Retrieval → Workspace Patch → Callout.
 */
export function applySpatialDiscoveryToWorkspace(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  /** When true, caller runs Auto Projection (Agent Loop). Default: auto. */
  readonly skipAutoProjection?: boolean;
}): ApplySpatialDiscoveryToWorkspaceResult {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  if (!contextEventId || !utterance) {
    return {
      handled: false,
      statusKo: null,
      entityCount: 0,
      relationCount: 0,
      calloutCount: 0,
      anchorTitleKo: null,
    };
  }

  const intent = parseSpatialDiscoveryIntent(utterance);
  if (!intent) {
    return {
      handled: false,
      statusKo: null,
      entityCount: 0,
      relationCount: 0,
      calloutCount: 0,
      anchorTitleKo: null,
    };
  }

  const state = readContextWorkspace(contextEventId);
  if (!state || (state.status !== "editing" && state.status !== "committing")) {
    return {
      handled: false,
      statusKo: null,
      entityCount: 0,
      relationCount: 0,
      calloutCount: 0,
      anchorTitleKo: null,
    };
  }

  // Slice A — near target scout: Reality Anchor fail-closed before Spatial Retrieval.
  let spatialCandidates = workspaceNodesToSpatialCandidates(state.nodes);
  if (isNearScoutUtterance(utterance)) {
    const nearGate = gateNearScoutAnchor({ utterance });
    if (nearGate.gated && !nearGate.ok) {
      return {
        handled: true,
        statusKo: nearGate.statusKo,
        entityCount: 0,
        relationCount: 0,
        calloutCount: 0,
        anchorTitleKo: null,
      };
    }
    if (nearGate.gated && nearGate.ok) {
      ensureWorkspaceAnchorNode({
        contextEventId,
        anchor: {
          entityId: nearGate.anchor.id,
          titleKo: nearGate.anchor.labelKo,
          labelKo: nearGate.anchor.labelKo,
          kind: nearGate.anchor.kind === "station" ? "station" : "attraction",
          lat: nearGate.anchor.lat,
          lng: nearGate.anchor.lng,
        },
        geoId: nearGate.anchor.id,
        summaryKo: `${nearGate.anchor.labelKo} · 검색 기준점`,
      });
      spatialCandidates = [
        {
          entityId: nearGate.anchor.id,
          titleKo: nearGate.anchor.labelKo,
          kind:
            nearGate.anchor.kind === "station" ? "station" : "attraction",
          lat: nearGate.anchor.lat,
          lng: nearGate.anchor.lng,
          selected: true,
          contextAnchor: true,
        },
        ...spatialCandidates.filter((c) => c.entityId !== nearGate.anchor.id),
      ];
    }
  }

  const retrieval = runSpatialRetrieval({
    text: utterance,
    workspaceId: state.workspaceId,
    contextTitleKo: state.summaryKo || state.query || "Workspace",
    candidates: spatialCandidates,
    log: false,
  });

  if (!retrieval.ok) {
    // Ambiguous anchor — still "handled" as spatial tool with short status
    if (retrieval.stage === "anchor" && retrieval.anchorCandidates?.length) {
      return {
        handled: true,
        statusKo: `기준 후보 ${retrieval.anchorCandidates.length}곳 · 지도에서 고르세요`,
        entityCount: 0,
        relationCount: 0,
        calloutCount: 0,
        anchorTitleKo: null,
      };
    }
    return {
      handled: true,
      statusKo: retrieval.reasonKo?.slice(0, 72) ?? "Spatial Discovery 실패",
      entityCount: 0,
      relationCount: 0,
      calloutCount: 0,
      anchorTitleKo: null,
    };
  }

  const domain = domainFromTarget(retrieval.intent.targetEntity);
  const discovered = retrieval.entities;

  // Reality Anchor Projection — stamp Anchor Object before candidates
  const realityAnchor = resolveRealityAnchorFromUtterance(utterance);
  ensureWorkspaceAnchorNode({
    contextEventId,
    anchor: {
      entityId: realityAnchor?.geoId ?? retrieval.anchor.entityId,
      titleKo: realityAnchor?.labelKo ?? retrieval.anchor.titleKo,
      labelKo: realityAnchor?.labelKo ?? retrieval.anchor.labelKo,
      kind: retrieval.anchor.kind,
      lat: realityAnchor?.lat ?? retrieval.anchor.lat,
      lng: realityAnchor?.lng ?? retrieval.anchor.lng,
    },
    geoId: realityAnchor?.geoId ?? null,
    summaryKo: `${retrieval.anchor.labelKo} · 기준점`,
  });

  // STEP 4–5 — Enrich + Evaluate before Workspace Patch (ADR-050).
  const rawCandidates = discovered.map(entityToSearchCandidate);
  const addCandidates = evaluateCandidateObjects(
    enrichDiscoveredObjects(rawCandidates),
  );

  {
    let turn = readLastAgentProductTurn();
    if (!turn || turn.contextEventId !== contextEventId) {
      turn = beginAgentProductTurn({
        contextEventId,
        utterance,
      });
    }
    turn = advanceAgentProductStage(turn, "planner");
    turn = advanceAgentProductStage(turn, "object_discovery");
    turn = advanceAgentProductStage(turn, "object_enrichment");
    advanceAgentProductStage(turn, "candidate_evaluation");
  }

  const next = applyWorkspaceTransition({
    contextEventId,
    op: "find_similar",
    domain,
    query: utterance,
    addCandidates,
    changeKo: `${retrieval.anchor.labelKo} 기준 ${discovered.length}곳`,
  });

  const afterAdd = readContextWorkspace(contextEventId) ?? next;
  if (!afterAdd) {
    return {
      handled: true,
      statusKo: "Workspace 업데이트 실패",
      entityCount: 0,
      relationCount: 0,
      calloutCount: 0,
      anchorTitleKo: retrieval.anchor.labelKo,
    };
  }

  // Map retrieval entityIds → workspace node ids (placeId / id)
  const metersByEntityId = new Map<string, number | null>();
  const toNodeIds: string[] = [];
  for (const e of discovered) {
    const node =
      afterAdd.nodes.find(
        (n) =>
          n.placeId === e.entityId ||
          n.id === e.entityId ||
          n.id.endsWith(`:${e.entityId}`) ||
          n.placeId.endsWith(e.entityId),
      ) ?? null;
    if (node) {
      toNodeIds.push(node.id);
      metersByEntityId.set(node.id, e.metersFromAnchor ?? null);
    }
  }

  const anchorNode =
    afterAdd.nodes.find(
      (n) =>
        n.id === retrieval.anchor.entityId ||
        n.placeId === retrieval.anchor.entityId,
    ) ?? null;

  const withDerived = withWorkspaceRelationships(
    {
      ...afterAdd,
      domain,
    },
    utterance,
  );

  const relationshipEdges = mergeSpatialRelations({
    existing: withDerived.relationshipEdges ?? [],
    fromId: anchorNode?.id ?? retrieval.anchor.entityId,
    toNodeIds,
    metersByEntityId,
  });

  writeContextWorkspace({
    ...withDerived,
    relationshipEdges,
    lastChangeKo: `${retrieval.anchor.labelKo} 근처 ${discovered.length}곳 · 관계 ${toNodeIds.length}`,
    updatedAtIso: new Date().toISOString(),
  });

  {
    const turn = readLastAgentProductTurn();
    if (turn?.contextEventId === contextEventId) {
      advanceAgentProductStage(turn, "workspace_patch");
    }
  }
  if (input.skipAutoProjection) {
    writeAgentRuntimeProjectionFromWorkspace({ contextEventId });
  }

  const calloutIds = toNodeIds.slice(0, 3);
  let calloutCount = 0;

  if (!input.skipAutoProjection) {
    writeContextWorkspaceExpanded(contextEventId, true);
    if (typeof window !== "undefined") {
      dispatchContextWorkspaceExpand({
        contextEventId,
        source: "scout_patch",
      });
    }
    try {
      openCalloutWindowsFromAgent(calloutIds);
      const projected = runAutoProjectionAfterPatch({
        contextEventId,
        entityIds: calloutIds,
      });
      calloutCount = projected.calloutCount;
    } catch {
      calloutCount = 0;
    }
  } else {
    try {
      openCalloutWindowsFromAgent(calloutIds);
    } catch {
      /* Agent Loop runs Auto Projection next */
    }
  }

  const targetLabel =
    retrieval.intent.targetEntity === "restaurant" ||
    retrieval.intent.targetEntity === "cafe"
      ? "맛집"
      : retrieval.intent.targetEntity === "hotel"
        ? "숙소"
        : retrieval.intent.targetEntity === "attraction"
          ? "명소"
          : "장소";
  const statusKo = `${retrieval.anchor.labelKo} 기준 ${targetLabel} ${discovered.length}곳 · Callout ${calloutCount}`;

  return {
    handled: true,
    statusKo: statusKo.slice(0, 72),
    entityCount: discovered.length,
    relationCount: toNodeIds.length,
    calloutCount,
    anchorTitleKo: retrieval.anchor.labelKo,
  };
}

/** True when utterance is SPATIAL_DISCOVERY (Tool Router gate). */
export function isSpatialDiscoveryUtterance(text: string): boolean {
  return parseSpatialDiscoveryIntent(text.trim()) != null;
}
