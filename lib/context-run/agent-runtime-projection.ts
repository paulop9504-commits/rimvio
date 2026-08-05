/**
 * STEP 6–7 — Agent Runtime Projection blob.
 * Map · Callout · Bottom sheet · Compare · Status all read this — no recompute.
 */

import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import {
  formatAgentProductStatusLog,
  readLastAgentProductTurn,
  type AgentProductPipelineStage,
} from "@/lib/context-run/agent-product-pipeline";
import { readWorkspaceProjection } from "@/lib/context-workspace/projection/compare-decision-state";

export type AgentRuntimeMapPin = {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly lat: number;
  readonly lng: number;
  readonly visible: boolean;
  readonly selected: boolean;
  readonly bookmarked: boolean;
};

export type AgentRuntimeProjection = {
  readonly contextEventId: string;
  readonly workspaceId: string;
  readonly revision: number;
  readonly updatedAtIso: string;
  /** Latest work-log line (chat status). */
  readonly statusKo: string | null;
  /** Full stage tape from product pipeline. */
  readonly workLog: readonly string[];
  readonly lastStage: AgentProductPipelineStage | null;
  readonly mapPins: readonly AgentRuntimeMapPin[];
  readonly selectedIds: readonly string[];
  readonly calloutFocusIds: readonly string[];
  readonly compareEntityIds: readonly string[];
  readonly visibleCount: number;
  readonly preparePending: boolean;
  readonly commitPending: boolean;
};

const projections = new Map<string, AgentRuntimeProjection>();
const listeners = new Set<() => void>();

function emitProjectionChange(): void {
  for (const l of listeners) l();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rimvio:agent-runtime-projection"));
  }
}

export function subscribeAgentRuntimeProjection(
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readAgentRuntimeProjection(
  contextEventId: string,
): AgentRuntimeProjection | null {
  return projections.get(contextEventId.trim()) ?? null;
}

export function clearAgentRuntimeProjectionForTests(
  contextEventId?: string,
): void {
  if (!contextEventId) {
    projections.clear();
    emitProjectionChange();
    return;
  }
  projections.delete(contextEventId.trim());
  emitProjectionChange();
}

/**
 * Build + store one Projection from Workspace SSOT (+ product turn status).
 */
export function writeAgentRuntimeProjectionFromWorkspace(input: {
  readonly contextEventId: string;
  readonly preparePending?: boolean;
  readonly commitPending?: boolean;
}): AgentRuntimeProjection | null {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) return null;
  const state = readContextWorkspace(contextEventId);
  if (!state) return null;

  const turn = readLastAgentProductTurn();
  const turnMatches =
    turn?.contextEventId === contextEventId ? turn : null;
  const compareProj = readWorkspaceProjection(contextEventId);
  const compareEntityIds =
    compareProj.mode === "compare_decision"
      ? compareProj.candidateEntityIds
      : (state.compareIds ?? []);
  const visible = state.nodes.filter((n) => n.visible);
  const selectedIds = state.selectedIds ?? [];
  const calloutFocusIds =
    selectedIds.length > 0
      ? selectedIds.slice(0, 3)
      : visible.slice(0, 3).map((n) => n.id);

  const proj: AgentRuntimeProjection = {
    contextEventId,
    workspaceId: state.workspaceId,
    revision: (state.patches?.length ?? 0) + visible.length,
    updatedAtIso: new Date().toISOString(),
    statusKo:
      formatAgentProductStatusLog(turnMatches) ??
      state.lastChangeKo ??
      null,
    workLog: turnMatches?.statusLog ?? [],
    lastStage:
      turnMatches?.stagesCompleted[
        turnMatches.stagesCompleted.length - 1
      ] ?? null,
    mapPins: visible.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      lat: n.lat,
      lng: n.lng,
      visible: n.visible,
      selected: n.selected,
      bookmarked: n.bookmarked,
    })),
    selectedIds,
    calloutFocusIds,
    compareEntityIds,
    visibleCount: visible.length,
    preparePending: input.preparePending === true,
    commitPending: input.commitPending === true,
  };
  projections.set(contextEventId, proj);
  emitProjectionChange();
  return proj;
}
