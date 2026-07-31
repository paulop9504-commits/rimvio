/**
 * Capsule Resume — restore Workspace + same Context Compiler IR (ADR-023 §6).
 */

import { estimateWorkspaceProgressPercent } from "@/lib/context-workspace/current-context-metrics";
import { domainLabelKo } from "@/lib/context-workspace/types";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import type { ContextCompilerIrV1 } from "@/lib/context-compiler/types";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import {
  listDraftContextWorkspaceEventIds,
  readContextWorkspace,
  writeContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import { withWorkspaceRelationships } from "@/lib/context-workspace/sync-workspace-relationships";

export type CapsuleProjection = {
  readonly contextEventId: string;
  readonly workspaceId: string;
  readonly labelKo: string;
  readonly domainKo: string;
  readonly progressPercent: number;
  readonly status: ContextWorkspaceState["status"];
  readonly compilerIr: ContextCompilerIrV1 | null;
  readonly preference: ContextCompilerIrV1["preference"] | null;
  readonly reality: ContextCompilerIrV1["reality"] | null;
  readonly nodeCount: number;
  readonly updatedAtIso: string;
};

export function readCapsuleCompilerIr(
  contextEventId: string,
): ContextCompilerIrV1 | null {
  return readContextWorkspace(contextEventId)?.compilerIr ?? null;
}

export function buildCapsuleProjection(
  state: ContextWorkspaceState,
): CapsuleProjection {
  const ir = state.compilerIr;
  return {
    contextEventId: state.contextEventId,
    workspaceId: state.workspaceId,
    labelKo:
      ir?.contextLabelKo?.trim() ||
      state.summaryKo.trim() ||
      state.query.trim() ||
      domainLabelKo(state.domain),
    domainKo: domainLabelKo(state.domain),
    progressPercent: estimateWorkspaceProgressPercent(state),
    status: state.status,
    compilerIr: ir,
    preference: ir?.preference ?? null,
    reality: ir?.reality ?? null,
    nodeCount: state.nodes.filter((n) => n.visible).length,
    updatedAtIso: state.updatedAtIso,
  };
}

export function listCapsuleProjections(): readonly CapsuleProjection[] {
  return listDraftContextWorkspaceEventIds()
    .map((id) => readContextWorkspace(id))
    .filter((s): s is ContextWorkspaceState => s != null && s.status === "editing")
    .map(buildCapsuleProjection);
}

/**
 * Resume Capsule → expand Workspace (Reality OS: Context → Workspace).
 * Compiler IR preferred but not required when Entity nodes already exist.
 */
export function resumeCapsuleWorkspace(input: {
  readonly contextEventId: string;
  readonly utterance?: string | null;
  readonly expand?: boolean;
}): {
  readonly state: ContextWorkspaceState;
  readonly compilerIr: ContextCompilerIrV1 | null;
} | null {
  const key = input.contextEventId.trim();
  const prev = readContextWorkspace(key);
  if (!prev || prev.status === "closed") {
    return null;
  }
  const hasEntities = prev.nodes.some((n) => n.visible);
  if (!hasEntities && !prev.compilerIr) {
    return null;
  }
  const next = withWorkspaceRelationships(prev, input.utterance);
  writeContextWorkspace(next);
  if (input.expand !== false) {
    writeContextWorkspaceExpanded(key, true);
    dispatchContextWorkspaceExpand({
      contextEventId: key,
      source: "capsule_resume",
    });
  }
  return { state: next, compilerIr: next.compilerIr ?? null };
}
