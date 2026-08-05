/**
 * Compare Decision Projection store — session UI mode linked to Context.
 * Candidate ids stay mirrored from Workspace SSOT `compareIds` (no parallel SSOT).
 */

import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import {
  DEFAULT_COMPARE_CRITERIA_WEIGHTS,
  type CompareDecisionCriteriaWeights,
  type CompareDecisionRelationship,
  type CompareDecisionState,
  type WorkspaceProjectionMode,
  type WorkspaceProjectionState,
} from "@/lib/context-workspace/projection/types";

const byContextId = new Map<string, WorkspaceProjectionState>();
const listeners = new Set<() => void>();

/** Stable empty — useSyncExternalStore getSnapshot must not allocate. */
const EMPTY_PROJECTION: WorkspaceProjectionState = Object.freeze({
  mode: "default",
  contextEventId: "",
});

function emit(): void {
  for (const l of listeners) l();
}

export function subscribeWorkspaceProjection(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function ensureDefault(contextEventId: string): WorkspaceProjectionState {
  const id = contextEventId.trim();
  if (!id) return EMPTY_PROJECTION;
  const existing = byContextId.get(id);
  if (existing) return existing;
  const next: WorkspaceProjectionState = { mode: "default", contextEventId: id };
  byContextId.set(id, next);
  return next;
}

export function readWorkspaceProjection(
  contextEventId: string,
): WorkspaceProjectionState {
  return ensureDefault(contextEventId);
}

export function getWorkspaceProjectionMode(
  contextEventId: string,
): WorkspaceProjectionMode {
  return readWorkspaceProjection(contextEventId).mode;
}

export function isCompareDecisionProjectionActive(
  contextEventId: string,
): boolean {
  return getWorkspaceProjectionMode(contextEventId) === "compare_decision";
}

function relationshipsFromWorkspace(
  workspace: Pick<ContextWorkspaceState, "relationshipEdges" | "compareIds">,
): CompareDecisionRelationship[] {
  const candidateSet = new Set(workspace.compareIds);
  const out: CompareDecisionRelationship[] = [];
  for (const e of workspace.relationshipEdges) {
    const touchesCompare =
      candidateSet.has(e.fromId) || candidateSet.has(e.toId);
    if (!touchesCompare && e.kind !== "compare") continue;
    if (
      e.kind === "compare" ||
      (candidateSet.has(e.fromId) && candidateSet.has(e.toId)) ||
      (touchesCompare && (e.kind === "nearby" || e.kind === "route"))
    ) {
      out.push({
        id: e.id,
        fromEntityId: e.fromId,
        toEntityId: e.toId,
        kind: e.kind,
        labelKo: e.labelKo,
        meters: e.meters,
      });
    }
    if (out.length >= 24) break;
  }
  return out;
}

/**
 * Enter Compare Decision projection.
 * Candidates come from Workspace SSOT (compareIds) — never a hotel-only store.
 */
export function enterCompareDecisionProjection(input: {
  readonly contextEventId: string;
  readonly workspace: Pick<
    ContextWorkspaceState,
    "compareIds" | "relationshipEdges" | "selectedIds"
  >;
  readonly criteriaWeights?: CompareDecisionCriteriaWeights;
  readonly selectedEntityId?: string | null;
}): CompareDecisionState | null {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) return null;
  const candidateEntityIds = [...input.workspace.compareIds].slice(0, 5);
  if (candidateEntityIds.length < 2) return null;

  const selected =
    input.selectedEntityId?.trim() ||
    input.workspace.selectedIds.find((id) => candidateEntityIds.includes(id)) ||
    candidateEntityIds[0] ||
    null;

  const next: CompareDecisionState = {
    mode: "compare_decision",
    contextEventId,
    candidateEntityIds,
    criteriaWeights: input.criteriaWeights ?? DEFAULT_COMPARE_CRITERIA_WEIGHTS,
    selectedEntityId: selected,
    relationships: relationshipsFromWorkspace(input.workspace),
  };
  byContextId.set(contextEventId, next);
  emit();
  return next;
}

/** Exit Compare Decision → default map observation. */
export function exitCompareDecisionProjection(contextEventId: string): void {
  const id = contextEventId.trim();
  if (!id) return;
  byContextId.set(id, { mode: "default", contextEventId: id });
  emit();
}

/** Keep projection candidates/edges in sync after Workspace SSOT updates. */
export function syncCompareDecisionProjectionFromWorkspace(input: {
  readonly contextEventId: string;
  readonly workspace: Pick<
    ContextWorkspaceState,
    "compareIds" | "relationshipEdges" | "selectedIds"
  >;
}): WorkspaceProjectionState {
  const id = input.contextEventId.trim();
  const current = readWorkspaceProjection(id);
  if (current.mode !== "compare_decision") {
    return current;
  }
  const candidateEntityIds = [...input.workspace.compareIds].slice(0, 5);
  if (candidateEntityIds.length < 2) {
    const next: WorkspaceProjectionState = { mode: "default", contextEventId: id };
    byContextId.set(id, next);
    emit();
    return next;
  }
  const selectedStillValid =
    current.selectedEntityId &&
    candidateEntityIds.includes(current.selectedEntityId)
      ? current.selectedEntityId
      : candidateEntityIds[0] ?? null;

  const next: CompareDecisionState = {
    mode: "compare_decision",
    contextEventId: id,
    candidateEntityIds,
    criteriaWeights: current.criteriaWeights,
    selectedEntityId: selectedStillValid,
    relationships: relationshipsFromWorkspace(input.workspace),
  };
  byContextId.set(id, next);
  emit();
  return next;
}

export function selectCompareDecisionEntity(input: {
  readonly contextEventId: string;
  readonly entityId: string;
}): CompareDecisionState | null {
  const id = input.contextEventId.trim();
  const current = readWorkspaceProjection(id);
  if (current.mode !== "compare_decision") return null;
  const entityId = input.entityId.trim();
  if (!current.candidateEntityIds.includes(entityId)) return null;
  const next: CompareDecisionState = {
    ...current,
    selectedEntityId: entityId,
  };
  byContextId.set(id, next);
  emit();
  return next;
}

export function clearWorkspaceProjectionForTests(): void {
  byContextId.clear();
  emit();
}
