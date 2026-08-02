/**
 * Draft Mutation store — Workspace Draft Layer only.
 * Creating a draft NEVER writes Global Reality.
 */

import type {
  DraftMutation,
  DraftMutationStatus,
} from "@/lib/workspace-command/types";

const drafts = new Map<string, DraftMutation>();
const byWorkspace = new Map<string, string[]>();

export function saveDraftMutation(draft: DraftMutation): DraftMutation {
  drafts.set(draft.id, draft);
  const list = byWorkspace.get(draft.workspaceId) ?? [];
  if (!list.includes(draft.id)) {
    byWorkspace.set(draft.workspaceId, [...list, draft.id]);
  }
  return draft;
}

export function readDraftMutation(draftId: string): DraftMutation | null {
  return drafts.get(draftId.trim()) ?? null;
}

export function listDraftMutations(
  workspaceId: string,
  status?: DraftMutationStatus,
): readonly DraftMutation[] {
  const ids = byWorkspace.get(workspaceId.trim()) ?? [];
  return ids
    .map((id) => drafts.get(id))
    .filter((d): d is DraftMutation => Boolean(d))
    .filter((d) => (status ? d.status === status : true));
}

export function listProposedDrafts(
  workspaceId: string,
): readonly DraftMutation[] {
  return listDraftMutations(workspaceId, "proposed");
}

export function updateDraftMutationStatus(
  draftId: string,
  status: DraftMutationStatus,
): DraftMutation | null {
  const prev = readDraftMutation(draftId);
  if (!prev) return null;
  const next: DraftMutation = {
    ...prev,
    status,
    updatedAtIso: new Date().toISOString(),
  };
  drafts.set(next.id, next);
  return next;
}

export function clearDraftMutationsForTests(workspaceId?: string): void {
  if (!workspaceId) {
    drafts.clear();
    byWorkspace.clear();
    return;
  }
  const id = workspaceId.trim();
  for (const did of byWorkspace.get(id) ?? []) {
    drafts.delete(did);
  }
  byWorkspace.delete(id);
}
