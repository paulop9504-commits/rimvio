/**
 * Map Workspace Command Intent → Workspace Mutation Engine.
 * Draft Instance only — Reality Object untouched.
 */

import type { WorkspaceIntent } from "@/lib/workspace-command/types";
import { runWorkspaceMutationEngine } from "@/lib/workspace/mutation";
import {
  createWorkspace,
  readWorkspace,
  readWorkspaceByContext,
} from "@/lib/workspace/workspace-store";
import type { Workspace } from "@/lib/workspace/workspace-types";

/** Ensure a Workspace State exists for this context (id = contextId by default). */
export function ensureWorkspaceState(input: {
  readonly contextId: string;
  readonly workspaceId?: string;
}): Workspace {
  const contextId = input.contextId.trim();
  const id = input.workspaceId?.trim() || contextId;
  return (
    readWorkspace(id) ??
    readWorkspaceByContext(contextId) ??
    createWorkspace({ id, contextId })
  );
}

export function applyWorkspaceIntentToState(input: {
  readonly contextId: string;
  readonly intent: WorkspaceIntent;
  readonly targetObjectId?: string | null;
}): Workspace | null {
  const result = runWorkspaceMutationEngine({
    contextId: input.contextId,
    intent: input.intent,
    objectId: input.targetObjectId,
  });
  if (!result.ok) return readWorkspaceByContext(input.contextId);
  return readWorkspace(result.workspaceId);
}
