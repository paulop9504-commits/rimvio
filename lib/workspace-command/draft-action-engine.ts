/**
 * Draft Action Engine — Intent → Proposal (not immediate state change).
 *
 * Intent → Draft Action → Expected result → User Apply
 * Never mutates Global Reality on propose.
 */

import { appendCommandHistory } from "@/lib/workspace-command/command-history";
import { saveDraftMutation } from "@/lib/workspace-command/draft-mutation-store";
import { analyzeDraftImpact } from "@/lib/workspace-command/impact-analyzer";
import {
  dispatchWorkspaceDraftEvent,
  WORKSPACE_DRAFT_CREATED,
} from "@/lib/workspace-command/projection-event";
import {
  buildRealityDiffFromIntent,
  formatRealityDiffPreviewKo,
} from "@/lib/workspace-command/reality-diff";
import type {
  DraftMutation,
  WorkspaceActionProposal,
  WorkspaceCommand,
  WorkspaceIntent,
} from "@/lib/workspace-command/types";
import {
  createWorkspace,
  readWorkspace,
  readWorkspaceByContext,
} from "@/lib/workspace/workspace-store";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function ensureWs(workspaceId: string) {
  return (
    readWorkspace(workspaceId) ??
    readWorkspaceByContext(workspaceId) ??
    createWorkspace({ id: workspaceId, contextId: workspaceId })
  );
}

/**
 * Propose a Draft Action — status always "proposed".
 * Does NOT apply to Workspace objects yet.
 */
export function proposeDraftAction(input: {
  readonly command: WorkspaceCommand;
  readonly intent: WorkspaceIntent;
  readonly targetObjectId?: string | null;
}): WorkspaceActionProposal {
  const workspaceId = input.command.workspaceId.trim();
  const ws = ensureWs(workspaceId);
  const realityDiff = buildRealityDiffFromIntent({
    workspace: ws,
    intent: input.intent,
  });
  const impact = analyzeDraftImpact({
    workspace: ws,
    intent: input.intent,
  });

  const now = new Date().toISOString();
  const draft: DraftMutation = {
    id: newId("draft"),
    workspaceId,
    targetObjectId:
      input.targetObjectId?.trim() ||
      (input.intent.target !== "workspace" ? input.intent.target : "hotel"),
    beforeState: { ...realityDiff.before },
    afterState: { ...realityDiff.after },
    impact,
    status: "proposed",
    intent: input.intent,
    commandId: input.command.id,
    rawText: input.command.rawText,
    realityDiff,
    createdAtIso: now,
    updatedAtIso: now,
  };

  saveDraftMutation(draft);
  appendCommandHistory({
    workspaceId,
    userInput: input.command.rawText,
    intent: input.intent,
    draftMutationId: draft.id,
  });

  dispatchWorkspaceDraftEvent(WORKSPACE_DRAFT_CREATED, {
    workspaceId,
    draftId: draft.id,
    status: "proposed",
    atIso: now,
    draftOnly: true,
  });

  return {
    draft,
    previewKo: formatRealityDiffPreviewKo(realityDiff),
    applyLabelKo: "적용",
    cancelLabelKo: "취소",
  };
}
