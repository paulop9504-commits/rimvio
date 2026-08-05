/**
 * Workspace Resolver — find the active Context that owns a provisional Workspace.
 * Globe Prompt uses this before tryApplyWorkspacePromptTurn (STEP 2).
 */

import { readGlobeProjectionLayerPolicy } from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
import {
  hasProvisionalContextWorkspace,
  listDraftContextWorkspaceEventIds,
  readContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";

/**
 * Resolve Context Event Id for Globe → Workspace Agent.
 * Priority: explicit ingress → Globe focus policy → expanded draft → any draft.
 */
export function resolveActiveWorkspaceContextId(input?: {
  readonly explicitContextEventId?: string | null;
}): string | null {
  const explicit = input?.explicitContextEventId?.trim() ?? "";
  if (explicit && hasProvisionalContextWorkspace(explicit)) {
    return explicit;
  }

  const policyId =
    readGlobeProjectionLayerPolicy().activeContextEventId?.trim() ?? "";
  if (policyId && hasProvisionalContextWorkspace(policyId)) {
    return policyId;
  }

  const drafts = listDraftContextWorkspaceEventIds();
  for (const id of drafts) {
    if (readContextWorkspaceExpanded(id)) {
      return id;
    }
  }
  return drafts[0]?.trim() || null;
}

/** True when Globe should route NL into Workspace Agent (not chat essay). */
export function hasActiveWorkspaceForGlobePrompt(input?: {
  readonly explicitContextEventId?: string | null;
}): boolean {
  return resolveActiveWorkspaceContextId(input) != null;
}
