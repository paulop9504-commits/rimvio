/**
 * Workspace lifecycle helpers — draft → published platform bridge (P9).
 */

import type {
  ContextWorkspaceLifecycle,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";
import { readContextWorkspace, writeContextWorkspace } from "@/lib/context-workspace/workspace-store";

export function defaultLifecycleForWorkspace(
  ws: Pick<ContextWorkspaceState, "status" | "realityDraft">,
): ContextWorkspaceLifecycle {
  if (ws.status === "committed") return "persistent";
  if (ws.realityDraft?.days?.length) return "persistent";
  return "private";
}

export function applyWorkspaceLifecycle(
  contextEventId: string,
  lifecycle: ContextWorkspaceLifecycle,
): ContextWorkspaceState | null {
  const ws = readContextWorkspace(contextEventId);
  if (!ws) return null;
  const next: ContextWorkspaceState = {
    ...ws,
    lifecycle,
    updatedAtIso: new Date().toISOString(),
  };
  writeContextWorkspace(next);
  return next;
}

/** Bridge Context Workspace → published platform state. */
export function bridgeWorkspaceToPublishedPlatform(input: {
  readonly contextEventId: string;
  readonly platformId: string;
}): ContextWorkspaceLifecycle {
  applyWorkspaceLifecycle(input.contextEventId, "published");
  return "published";
}

export function resolveWorkspaceLifecycle(
  ws: ContextWorkspaceState | null,
): ContextWorkspaceLifecycle {
  if (!ws) return "draft";
  return ws.lifecycle ?? defaultLifecycleForWorkspace(ws);
}
