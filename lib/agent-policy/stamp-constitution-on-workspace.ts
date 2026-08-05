/**
 * Stamp Laws 14·15·19·25 onto Workspace after an Agent mutation.
 */

import {
  buildAgentActionOwnership,
  ownershipSummaryKo,
} from "@/lib/agent-policy/action-ownership";
import {
  appendAgentTrace,
  createAgentTraceEntry,
  type AgentTraceKind,
} from "@/lib/agent-policy/agent-trace";
import {
  applyConstraintMemoryToScoutQuery,
  constraintMemoryLinesKo,
  mergeConstraintMemoryFromUtterance,
  type ConstraintMemoryBag,
} from "@/lib/agent-policy/constraint-memory";
import {
  buildRecommendEvidence,
  gateRecommendCopy,
} from "@/lib/agent-policy/evidence-gate";
import type { WorkspaceMutationMode } from "@/lib/agent-policy/cursor-agent-policy";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";

export function rememberConstraintsOnWorkspace(input: {
  readonly contextEventId: string;
  readonly utterance: string;
}): ConstraintMemoryBag | null {
  const state = readContextWorkspace(input.contextEventId);
  if (!state) return null;
  const bag = mergeConstraintMemoryFromUtterance({
    prev: state.constraintMemory ?? null,
    utterance: input.utterance,
  });
  writeContextWorkspace({
    ...state,
    constraintMemory: bag,
    updatedAtIso: new Date().toISOString(),
  });
  return bag;
}

export function scoutQueryWithConstraintMemory(input: {
  readonly contextEventId: string;
  readonly utterance: string;
}): string {
  const state = readContextWorkspace(input.contextEventId);
  const bag = mergeConstraintMemoryFromUtterance({
    prev: state?.constraintMemory ?? null,
    utterance: input.utterance,
  });
  if (state) {
    writeContextWorkspace({
      ...state,
      constraintMemory: bag,
      updatedAtIso: new Date().toISOString(),
    });
  }
  return applyConstraintMemoryToScoutQuery(input.utterance, bag);
}

export function stampAgentConstitutionOnWorkspace(input: {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly mutationMode: WorkspaceMutationMode;
  readonly beforeSummaryKo?: string | null;
}): ContextWorkspaceState | null {
  const state = readContextWorkspace(input.contextEventId);
  if (!state) return null;

  const bag = mergeConstraintMemoryFromUtterance({
    prev: state.constraintMemory ?? null,
    utterance: input.utterance,
  });
  const constraintLines = constraintMemoryLinesKo(bag);

  const top =
    state.nodes.find((n) => n.selected && n.visible) ??
    state.nodes.find((n) => n.visible) ??
    null;

  const evidence = top
    ? buildRecommendEvidence({
        node: top,
        constraints: bag,
        judgmentKo: state.lastWhy?.reasonsKo[0] ?? null,
      })
    : {
        ok: false as const,
        linesKo: [] as readonly string[],
        kinds: [] as readonly import("@/lib/agent-policy/evidence-gate").RecommendEvidenceKind[],
      };

  const gated = top
    ? gateRecommendCopy({
        titleKo: top.title,
        evidence,
        fallbackKo: state.lastChangeKo,
      })
    : null;

  const kind: AgentTraceKind =
    input.mutationMode === "replace"
      ? "replace"
      : input.mutationMode === "refine"
        ? "refine"
        : "note";

  const ownership = buildAgentActionOwnership({
    actor: "ai",
    approval: "none",
    actionKo:
      input.mutationMode === "replace"
        ? "후보 재검색·교체"
        : input.mutationMode === "refine"
          ? "후보 다듬기"
          : "작업 반영",
    beforeKo: input.beforeSummaryKo ?? null,
    afterKo: state.summaryKo,
  });

  const entry = createAgentTraceEntry({
    kind,
    summaryKo: ownershipSummaryKo(ownership),
    ownership,
    evidenceLinesKo: [
      ...constraintLines,
      ...(gated?.evidence.linesKo ?? []),
    ],
    entityIds: top ? [top.id] : [],
  });

  const next: ContextWorkspaceState = {
    ...state,
    constraintMemory: bag,
    agentTrace: appendAgentTrace(state.agentTrace, entry),
    lastChangeKo:
      gated?.ok && gated.copyKo
        ? gated.copyKo
        : state.lastChangeKo ?? ownership.actionKo,
    lastWhy: top
      ? {
          actionKo: ownership.actionKo,
          reasonsKo:
            gated?.evidence.linesKo.length
              ? [...gated.evidence.linesKo]
              : constraintLines.length > 0
                ? constraintLines
                : ["Context 조건 반영"],
          impactsKo: [`Actor · ${ownership.actor}`, ownership.actionKo],
          nodeIds: [top.id],
          atIso: ownership.atIso,
        }
      : state.lastWhy,
    updatedAtIso: new Date().toISOString(),
  };

  writeContextWorkspace(next);
  return next;
}
