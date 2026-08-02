/**
 * Workspace Mutation Engine
 *
 * Intent → Engine Mutation → Workspace State (never Global Reality)
 */

export type {
  WorkspaceEngineApplyResult,
  WorkspaceEngineMutation,
  WorkspaceEngineMutationType,
} from "@/lib/workspace/mutation/types";
export { WORKSPACE_ENGINE_MUTATION_TYPES } from "@/lib/workspace/mutation/types";

export { intentToEngineMutation } from "@/lib/workspace/mutation/intent-to-mutation";
export { applyWorkspaceEngineMutation } from "@/lib/workspace/mutation/apply-mutation";
export {
  applyFilterVisibility,
  objectMatchesCategory,
  objectMatchesTargetKind,
} from "@/lib/workspace/mutation/object-match";

import type { WorkspaceIntent } from "@/lib/workspace-command/types";
import { applyWorkspaceEngineMutation } from "@/lib/workspace/mutation/apply-mutation";
import { intentToEngineMutation } from "@/lib/workspace/mutation/intent-to-mutation";
import type { WorkspaceEngineApplyResult } from "@/lib/workspace/mutation/types";
import {
  createWorkspace,
  readWorkspace,
  readWorkspaceByContext,
} from "@/lib/workspace/workspace-store";

/** Intent → Mutation → apply on Workspace State */
export function runWorkspaceMutationEngine(input: {
  readonly contextId: string;
  readonly intent: WorkspaceIntent;
  readonly objectId?: string | null;
  readonly workspaceId?: string;
}): WorkspaceEngineApplyResult {
  const contextId = input.contextId.trim();
  const id = input.workspaceId?.trim() || contextId;
  const ws =
    readWorkspace(id) ??
    readWorkspaceByContext(contextId) ??
    createWorkspace({ id, contextId });

  const mutation = intentToEngineMutation(input.intent, {
    objectId: input.objectId,
  });
  if (!mutation) {
    return {
      ok: false,
      reasonKo: "Intent를 Mutation으로 바꿀 수 없어요",
      forbiddenRealityMutation: false,
    };
  }
  return applyWorkspaceEngineMutation({
    workspaceId: ws.id,
    mutation,
  });
}
