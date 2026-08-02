/**
 * Workspace History — Before → Mutation → After, with Rollback.
 */

import type {
  Workspace,
  WorkspaceHistoryEntry,
  WorkspaceSnapshot,
  WorkspaceStateMutation,
} from "@/lib/workspace/workspace-types";

const historyByWorkspace = new Map<string, WorkspaceHistoryEntry[]>();
const futureByWorkspace = new Map<string, WorkspaceHistoryEntry[]>();

const MAX_HISTORY = 40;

export function snapshotWorkspace(ws: Workspace): WorkspaceSnapshot {
  return {
    objects: ws.objects.map((o) => ({ ...o, tags: [...o.tags], attrs: { ...o.attrs } })),
    constraints: ws.constraints.map((c) => ({ ...c })),
    filters: ws.filters.map((f) => ({ ...f })),
    drafts: ws.drafts.map((d) => ({ ...d, payload: { ...d.payload } })),
    simulationResults: ws.simulationResults.map((s) => ({
      ...s,
      result: { ...s.result },
    })),
    revision: ws.revision,
    updatedAtIso: ws.updatedAtIso,
  };
}

export function applySnapshotToWorkspace(
  ws: Workspace,
  snap: WorkspaceSnapshot,
): Workspace {
  return {
    ...ws,
    objects: snap.objects,
    constraints: snap.constraints,
    filters: snap.filters,
    drafts: snap.drafts,
    simulationResults: snap.simulationResults,
    revision: snap.revision,
    updatedAtIso: snap.updatedAtIso,
  };
}

export function recordWorkspaceHistory(input: {
  readonly workspaceId: string;
  readonly before: WorkspaceSnapshot;
  readonly mutation: WorkspaceStateMutation;
  readonly after: WorkspaceSnapshot;
}): WorkspaceHistoryEntry {
  const entry: WorkspaceHistoryEntry = {
    id: `wh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    workspaceId: input.workspaceId,
    before: input.before,
    mutation: input.mutation,
    after: input.after,
    atIso: input.mutation.atIso,
  };
  const stack = historyByWorkspace.get(input.workspaceId) ?? [];
  historyByWorkspace.set(input.workspaceId, [...stack, entry].slice(-MAX_HISTORY));
  // New mutation clears redo stack
  futureByWorkspace.set(input.workspaceId, []);
  return entry;
}

export function listWorkspaceHistory(
  workspaceId: string,
): readonly WorkspaceHistoryEntry[] {
  return historyByWorkspace.get(workspaceId.trim()) ?? [];
}

export function clearWorkspaceHistory(workspaceId: string): void {
  const id = workspaceId.trim();
  historyByWorkspace.delete(id);
  futureByWorkspace.delete(id);
}

/**
 * Rollback to Before State of the last mutation.
 * Returns the Before snapshot to restore into the store.
 */
export function rollbackWorkspaceHistory(
  workspaceId: string,
): {
  readonly ok: true;
  readonly snapshot: WorkspaceSnapshot;
  readonly undone: WorkspaceHistoryEntry;
} | {
  readonly ok: false;
  readonly reasonKo: string;
} {
  const id = workspaceId.trim();
  const stack = [...(historyByWorkspace.get(id) ?? [])];
  const last = stack.pop();
  if (!last) {
    return { ok: false, reasonKo: "되돌릴 History가 없어요" };
  }
  historyByWorkspace.set(id, stack);
  const future = futureByWorkspace.get(id) ?? [];
  futureByWorkspace.set(id, [last, ...future].slice(0, MAX_HISTORY));
  return { ok: true, snapshot: last.before, undone: last };
}

/** Re-apply After State of the last undone entry (redo). */
export function redoWorkspaceHistory(
  workspaceId: string,
): {
  readonly ok: true;
  readonly snapshot: WorkspaceSnapshot;
  readonly redone: WorkspaceHistoryEntry;
} | {
  readonly ok: false;
  readonly reasonKo: string;
} {
  const id = workspaceId.trim();
  const future = [...(futureByWorkspace.get(id) ?? [])];
  const next = future.shift();
  if (!next) {
    return { ok: false, reasonKo: "다시 적용할 History가 없어요" };
  }
  futureByWorkspace.set(id, future);
  const stack = historyByWorkspace.get(id) ?? [];
  historyByWorkspace.set(id, [...stack, next].slice(-MAX_HISTORY));
  return { ok: true, snapshot: next.after, redone: next };
}

export function clearAllWorkspaceHistoryForTests(): void {
  historyByWorkspace.clear();
  futureByWorkspace.clear();
}
