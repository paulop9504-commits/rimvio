/**
 * Context Anchor tap → Workspace Resume (Reality OS).
 * Globe pin = Context project, not a place detail sheet.
 */

import { resumeCapsuleWorkspace } from "@/lib/context-workspace/resume-capsule-workspace";
import {
  hasProvisionalContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import { estimateWorkspaceProgressPercent } from "@/lib/context-workspace/current-context-metrics";

export type ContextAnchorWorkspaceOpenResult =
  | {
      readonly ok: true;
      readonly state: ContextWorkspaceState;
      readonly progressPercent: number;
    }
  | { readonly ok: false };

/**
 * If this Context has an open Workspace with Entities, expand it.
 */
export function tryOpenContextAnchorWorkspace(input: {
  readonly contextEventId: string;
  readonly utterance?: string | null;
}): ContextAnchorWorkspaceOpenResult {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return { ok: false };
  }
  if (!hasProvisionalContextWorkspace(contextEventId)) {
    return { ok: false };
  }
  const draft = readContextWorkspace(contextEventId);
  if (!draft?.nodes.some((n) => n.visible)) {
    return { ok: false };
  }
  const resumed = resumeCapsuleWorkspace({
    contextEventId,
    utterance: input.utterance,
    expand: true,
  });
  if (!resumed) {
    return { ok: false };
  }
  return {
    ok: true,
    state: resumed.state,
    progressPercent: estimateWorkspaceProgressPercent(resumed.state),
  };
}

/** Capsule chrome for Globe Anchor — progress only when Workspace exists. */
export function readContextAnchorProgressPercent(
  contextEventId: string | null | undefined,
): number | null {
  const id = contextEventId?.trim() ?? "";
  if (!id || !hasProvisionalContextWorkspace(id)) {
    return null;
  }
  const draft = readContextWorkspace(id);
  if (!draft?.nodes.some((n) => n.visible)) {
    return null;
  }
  return estimateWorkspaceProgressPercent(draft);
}

export function readContextAnchorLastChangeKo(
  contextEventId: string | null | undefined,
): string | null {
  const id = contextEventId?.trim() ?? "";
  if (!id) return null;
  const draft = readContextWorkspace(id);
  const line = draft?.lastChangeKo?.trim();
  return line || null;
}
