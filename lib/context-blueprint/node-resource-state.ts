/**
 * Resource scout FSM on travel Execution Graph nodes (departure / stay / explore).
 * Not a "container" type — lives on ExecutionGraphNode.resourceState.
 * @see docs/RIMVIO_CONTAINER_AI.md (onboarding parallel exception)
 */

import type { ExecutionGraphNode } from "@/lib/context-blueprint/execution-graph";
import type { ExecutionNodeKind } from "@/lib/context-blueprint/execution-graph";

export const NODE_RESOURCE_STATUSES = [
  "empty",
  "searching",
  "filled",
  "selected",
  "locked",
] as const;

export type NodeResourceStatus = (typeof NODE_RESOURCE_STATUSES)[number];

/** Lightweight candidate wire for resource FSM (domain payloads stay elsewhere). */
export type NodeResourceCandidate = {
  readonly id: string;
  readonly title: string;
  readonly placeId?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly meta?: Readonly<Record<string, unknown>>;
};

export type NodeResourceState = {
  readonly status: NodeResourceStatus;
  /** departure/stay true · explore false */
  readonly dateDependent: boolean;
  /**
   * Spatial anchor for radius scout.
   * departure has no anchor (OD pair search) — leave null.
   */
  readonly anchorRef: string | null;
  readonly candidates: readonly NodeResourceCandidate[];
  readonly selected: NodeResourceCandidate | null;
};

export const TRAVEL_ONBOARDING_PARALLEL_NODE_IDS = [
  "departure",
  "stay",
  "explore",
] as const;

export type TravelOnboardingParallelNodeId =
  (typeof TRAVEL_ONBOARDING_PARALLEL_NODE_IDS)[number];

export function composeEmptyNodeResourceState(input: {
  dateDependent: boolean;
  anchorRef?: string | null;
}): NodeResourceState {
  return {
    status: "empty",
    dateDependent: input.dateDependent,
    anchorRef: input.anchorRef ?? null,
    candidates: [],
    selected: null,
  };
}

/** Radius-scout nodes require anchor_ref; departure is whitelisted without one. */
export function nodeRequiresResourceAnchor(
  nodeKind: ExecutionNodeKind | string,
): boolean {
  return nodeKind !== "departure";
}

export function assertNodeResourceAnchor(input: {
  nodeKind: ExecutionNodeKind | string;
  resourceState: NodeResourceState | null | undefined;
}): { ok: true } | { ok: false; code: "missing_anchor_ref" } {
  if (!nodeRequiresResourceAnchor(input.nodeKind)) {
    return { ok: true };
  }
  if (!input.resourceState?.anchorRef?.trim()) {
    return { ok: false, code: "missing_anchor_ref" };
  }
  return { ok: true };
}

export function isNodeResourceLocked(
  state: NodeResourceState | null | undefined,
): boolean {
  return state?.status === "locked";
}

/**
 * Date change → which travel nodes may rescout vs availability_recheck only.
 * explore (dateDependent false) never rescouts from date patch.
 * locked → recheck only (never silent replace).
 */
export function planTravelDateDependentRescout(input: {
  nodes: readonly Pick<ExecutionGraphNode, "id" | "kind" | "resourceState">[];
}): {
  readonly rescoutNodeIds: readonly string[];
  readonly availabilityRecheckNodeIds: readonly string[];
  readonly skippedExploreNodeIds: readonly string[];
} {
  const rescoutNodeIds: string[] = [];
  const availabilityRecheckNodeIds: string[] = [];
  const skippedExploreNodeIds: string[] = [];

  for (const node of input.nodes) {
    const state = node.resourceState;
    if (!state) {
      continue;
    }
    if (node.kind === "explore" || state.dateDependent === false) {
      skippedExploreNodeIds.push(node.id);
      continue;
    }
    if (state.status === "locked") {
      availabilityRecheckNodeIds.push(node.id);
      continue;
    }
    if (
      state.status === "empty" ||
      state.status === "searching" ||
      state.status === "filled" ||
      state.status === "selected"
    ) {
      rescoutNodeIds.push(node.id);
    }
  }

  return { rescoutNodeIds, availabilityRecheckNodeIds, skippedExploreNodeIds };
}

/** Route blocked if caller asks to rescout a locked node. */
export function assertTravelRescoutAllowed(input: {
  resourceState: NodeResourceState | null | undefined;
}):
  | { ok: true }
  | { ok: false; code: "locked_forbid_rescout"; forceAction: "availability_recheck" } {
  if (input.resourceState?.status === "locked") {
    return {
      ok: false,
      code: "locked_forbid_rescout",
      forceAction: "availability_recheck",
    };
  }
  return { ok: true };
}
