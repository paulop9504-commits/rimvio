/**
 * Natural Language → WorkspaceCommand envelope.
 */

import type { WorkspaceCommand } from "@/lib/workspace-command/types";

export function createWorkspaceCommand(input: {
  readonly workspaceId: string;
  readonly rawText: string;
  readonly nowIso?: string;
}): WorkspaceCommand {
  const workspaceId = input.workspaceId.trim();
  const rawText = input.rawText.trim();
  const createdAt = input.nowIso ?? new Date().toISOString();
  const id = `wcmd_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  return {
    id,
    workspaceId,
    rawText,
    createdAt,
  };
}

/** Parse raw NL into a command record (no intent yet). */
export function parseWorkspaceCommand(input: {
  readonly workspaceId: string;
  readonly rawText: string;
}): WorkspaceCommand | null {
  if (!input.workspaceId.trim() || !input.rawText.trim()) {
    return null;
  }
  return createWorkspaceCommand(input);
}
