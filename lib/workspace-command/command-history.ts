/**
 * Command History — User Input → Intent → Draft Mutation → Applied State
 */

import type {
  WorkspaceCommandHistoryEntry,
  WorkspaceIntent,
} from "@/lib/workspace-command/types";

const historyByWorkspace = new Map<string, WorkspaceCommandHistoryEntry[]>();

const MAX = 50;

export function appendCommandHistory(input: {
  readonly workspaceId: string;
  readonly userInput: string;
  readonly intent: WorkspaceIntent | null;
  readonly draftMutationId?: string | null;
}): WorkspaceCommandHistoryEntry {
  const entry: WorkspaceCommandHistoryEntry = {
    id: `wch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    workspaceId: input.workspaceId.trim(),
    userInput: input.userInput,
    intent: input.intent,
    draftMutationId: input.draftMutationId ?? null,
    appliedAtIso: null,
    createdAtIso: new Date().toISOString(),
  };
  const stack = historyByWorkspace.get(entry.workspaceId) ?? [];
  historyByWorkspace.set(entry.workspaceId, [...stack, entry].slice(-MAX));
  return entry;
}

export function markCommandHistoryApplied(input: {
  readonly workspaceId: string;
  readonly draftMutationId: string;
}): void {
  const stack = historyByWorkspace.get(input.workspaceId.trim()) ?? [];
  historyByWorkspace.set(
    input.workspaceId.trim(),
    stack.map((e) =>
      e.draftMutationId === input.draftMutationId
        ? { ...e, appliedAtIso: new Date().toISOString() }
        : e,
    ),
  );
}

export function listCommandHistory(
  workspaceId: string,
): readonly WorkspaceCommandHistoryEntry[] {
  return historyByWorkspace.get(workspaceId.trim()) ?? [];
}

export function clearCommandHistoryForTests(workspaceId?: string): void {
  if (!workspaceId) {
    historyByWorkspace.clear();
    return;
  }
  historyByWorkspace.delete(workspaceId.trim());
}
