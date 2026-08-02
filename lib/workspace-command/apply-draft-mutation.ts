/**
 * Apply / Reject Draft Mutation — only then update Workspace State.
 * Global Reality Store remains Read Only.
 * Projection Engine refreshes Globe / Workspace UI from Draft only.
 */

import { markCommandHistoryApplied } from "@/lib/workspace-command/command-history";
import {
  readDraftMutation,
  updateDraftMutationStatus,
} from "@/lib/workspace-command/draft-mutation-store";
import {
  dispatchWorkspaceDraftEvent,
  dispatchWorkspaceProjectionUpdate,
  WORKSPACE_DRAFT_APPLIED,
  WORKSPACE_DRAFT_UPDATED,
} from "@/lib/workspace-command/projection-event";
import type { DraftMutation } from "@/lib/workspace-command/types";
import { runWorkspaceMutationEngine } from "@/lib/workspace/mutation";
import { getRealityObject } from "@/lib/reality-object/reality-object-store";
import { readWorkspace } from "@/lib/workspace/workspace-store";
import { projectDraftMutationApplied } from "@/lib/projection-engine";

export type ApplyDraftResult =
  | {
      readonly ok: true;
      readonly draft: DraftMutation;
      readonly summaryKo: string;
      readonly projectionEventCount?: number;
    }
  | {
      readonly ok: false;
      readonly reasonKo: string;
      readonly forbiddenRealityMutation?: boolean;
    };

export function applyDraftMutation(draftId: string): ApplyDraftResult {
  const draft = readDraftMutation(draftId);
  if (!draft) {
    return { ok: false, reasonKo: "Draft를 찾을 수 없어요" };
  }
  if (draft.status !== "proposed") {
    return { ok: false, reasonKo: `이미 ${draft.status} 상태예요` };
  }

  const ws = readWorkspace(draft.workspaceId);
  const beforeObjects =
    ws?.objects.map((o) => ({
      ...o,
      tags: [...o.tags],
      attrs: { ...o.attrs },
    })) ?? [];
  const realityStamps = beforeObjects.map((o) => ({
    id: o.realityObjectId,
    at: getRealityObject(o.realityObjectId)?.updatedAt ?? null,
  }));

  // Apply to Workspace State Model only (Draft Environment)
  const engine = runWorkspaceMutationEngine({
    contextId: draft.workspaceId,
    workspaceId: draft.workspaceId,
    intent: draft.intent,
    objectId:
      draft.targetObjectId !== "hotel" && draft.targetObjectId !== "workspace"
        ? draft.targetObjectId
        : null,
  });

  if (!engine.ok) {
    return {
      ok: false,
      reasonKo: engine.reasonKo,
      forbiddenRealityMutation: engine.forbiddenRealityMutation,
    };
  }

  for (const stamp of realityStamps) {
    const still = getRealityObject(stamp.id);
    if (still && stamp.at != null && still.updatedAt !== stamp.at) {
      return {
        ok: false,
        reasonKo: "Global Reality Store 변경 감지 — 적용 중단",
        forbiddenRealityMutation: true,
      };
    }
  }

  const applied = updateDraftMutationStatus(draft.id, "applied");
  if (!applied) {
    return { ok: false, reasonKo: "Draft 상태 갱신 실패" };
  }

  markCommandHistoryApplied({
    workspaceId: draft.workspaceId,
    draftMutationId: draft.id,
  });

  // Projection Layer — UI only, Reality Read Only
  const projection = projectDraftMutationApplied({
    draft: applied,
    beforeObjects,
    summaryKo: engine.summaryKo,
  });

  const atIso = new Date().toISOString();
  dispatchWorkspaceDraftEvent(WORKSPACE_DRAFT_APPLIED, {
    workspaceId: draft.workspaceId,
    draftId: draft.id,
    status: "applied",
    atIso,
    draftOnly: true,
  });
  dispatchWorkspaceProjectionUpdate({
    workspaceId: draft.workspaceId,
    commandId: draft.commandId,
    intentAction: draft.intent.action,
    mutationType: "draft_applied",
    atIso,
    draftOnly: true,
    draftId: draft.id,
  });

  return {
    ok: true,
    draft: applied,
    summaryKo: engine.summaryKo,
    projectionEventCount: projection?.events.length ?? 0,
  };
}

export function rejectDraftMutation(draftId: string): ApplyDraftResult {
  const draft = readDraftMutation(draftId);
  if (!draft) {
    return { ok: false, reasonKo: "Draft를 찾을 수 없어요" };
  }
  if (draft.status !== "proposed") {
    return { ok: false, reasonKo: `이미 ${draft.status} 상태예요` };
  }
  const rejected = updateDraftMutationStatus(draft.id, "rejected");
  if (!rejected) {
    return { ok: false, reasonKo: "Draft 취소 실패" };
  }
  dispatchWorkspaceDraftEvent(WORKSPACE_DRAFT_UPDATED, {
    workspaceId: draft.workspaceId,
    draftId: draft.id,
    status: "rejected",
    atIso: new Date().toISOString(),
    draftOnly: true,
  });
  return {
    ok: true,
    draft: rejected,
    summaryKo: "변경을 취소했어요",
  };
}
