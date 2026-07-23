/**
 * Refresh stored Capsule IR against live Workspace (ADR-023 §6).
 * Preference lineage preserved via priorIr; graph · reality recompiled.
 */

import { compileContextFromUtterance } from "@/lib/context-compiler/compile-context-from-utterance";
import type { ContextCompilerIrV1 } from "@/lib/context-compiler/types";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import type { SessionGraphV1 } from "@/lib/graph-command/types";

export function refreshCompilerIrForWorkspace(input: {
  readonly priorIr: ContextCompilerIrV1;
  readonly utterance?: string | null;
  readonly workspace: ContextWorkspaceState;
  readonly graph?: SessionGraphV1 | null;
}): ContextCompilerIrV1 {
  const utterance =
    input.utterance?.trim() ||
    input.workspace.query.trim() ||
    input.priorIr.contextLabelKo ||
    "";
  return compileContextFromUtterance({
    utterance,
    graph: input.graph ?? null,
    workspace: input.workspace,
    contextLabelKo: input.priorIr.contextLabelKo,
    priorIr: input.priorIr,
  });
}
