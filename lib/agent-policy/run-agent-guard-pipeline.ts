/**
 * Agent Guard Pipeline — policy judgment only.
 *
 * NL → Intent (caller)
 *   → Job Classification
 *   → P1 Preflight (Ambiguity · Action · Scope · Idempotency)
 *   → P0 Job Boundary / Stale
 *   → Constraint Carry-over (per-field policy)
 *   → GuardDecision
 *
 * Agent Loop commits + Tools / Patch / Projection / Postcondition.
 */

import { classifyAgentJobTurn, type JobTurnClassification } from "@/lib/agent-policy/classify-agent-job-turn";
import { resolveAgentActionLevel, type AgentActionLevel } from "@/lib/agent-policy/action-level-gate";
import { resolveAmbiguityGate } from "@/lib/agent-policy/ambiguity-gate";
import {
  resolveConstraintCarryOver,
  type ConstraintCarryOverResult,
} from "@/lib/agent-policy/constraint-carry-over";
import {
  resolveMutationScopeGuard,
  isPatchKindAllowed,
} from "@/lib/agent-policy/mutation-scope-guard";
import {
  buildAgentIdempotencyKey,
  resolveIdempotencyGate,
} from "@/lib/agent-policy/idempotency-gate";
import { applyConstraintMemoryToScoutQuery } from "@/lib/agent-policy/constraint-memory";
import { evaluateAgentP0Guards, type AgentP0EvaluateResult } from "@/lib/agent-policy/evaluate-agent-p0-guards";
import { readWorkspaceRevision } from "@/lib/agent-policy/workspace-revision";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import type { GuardDecision } from "@/lib/agent-policy/guard-decision";
import type { AgentJob } from "@/lib/agent-policy/agent-job";
import type { WorkspaceMutationMode } from "@/lib/agent-policy/cursor-agent-policy";

export type AgentGuardContinuePayload = {
  readonly decision: Extract<GuardDecision, { action: "CONTINUE" }>;
  readonly classification: JobTurnClassification;
  readonly actionLevel: AgentActionLevel;
  readonly allowPrepare: boolean;
  readonly discoverOnly: boolean;
  readonly job: AgentJob;
  readonly switchJob: boolean;
  readonly abortSoftContinue: boolean;
  readonly forceReplaceScout: boolean;
  readonly scoutFingerprint: string;
  readonly allowSoftNextAuto: boolean;
  readonly stampConstitution: boolean;
  readonly mutationMode: WorkspaceMutationMode;
  readonly carry: ConstraintCarryOverResult;
  readonly scoutUtterance: string;
  readonly idempotencyKey: string;
  readonly statusHintKo: string | null;
};

export type AgentGuardPipelineResult =
  | {
      readonly ok: false;
      readonly decision: Extract<
        GuardDecision,
        { action: "STOP" } | { action: "ASK" }
      >;
    }
  | {
      readonly ok: true;
      readonly decision: Extract<GuardDecision, { action: "CONTINUE" }>;
      readonly payload: AgentGuardContinuePayload;
    };

function stop(
  code: Extract<GuardDecision, { action: "STOP" }>["code"],
  statusKo: string,
): AgentGuardPipelineResult {
  return {
    ok: false,
    decision: { action: "STOP", code, statusKo },
  };
}

/**
 * Pure Guard pipeline — does not write Workspace / Tools / Soft-next.
 */
export function evaluateAgentGuardPipeline(input: {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly patchKind?: string | null;
  readonly toolId?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly scoutMode?: "replace" | "add" | "refine";
}): AgentGuardPipelineResult {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  const state = readContextWorkspace(contextEventId);
  const hasVisible = Boolean(state?.nodes.some((n) => n.visible));

  // 1. Job Classification (before Preflight)
  const classification = classifyAgentJobTurn({
    utterance,
    hasVisibleCandidates: hasVisible,
    patchKind: input.patchKind ?? null,
    previousJob: state?.agentJob ?? null,
  });

  // 2. P1 Preflight — Ambiguity
  const ambiguity = resolveAmbiguityGate({
    utterance,
    contextEventId,
  });
  if (!ambiguity.ok) {
    return stop("ambiguity", ambiguity.statusKo);
  }

  // 2b. Action Level
  const action = resolveAgentActionLevel(utterance);
  if (
    input.toolId === "reality_prepare" &&
    (!action.allowPrepare || action.discoverOnly)
  ) {
    return stop(
      "action_level",
      action.statusKo ??
        "지금은 검색 단계예요 · 예약 준비는 후보를 고른 뒤에",
    );
  }

  // 2c. Mutation Scope
  const mutationScope = resolveMutationScopeGuard({
    utterance,
    patchKind: input.patchKind ?? null,
  });
  if (!mutationScope.ok) {
    return stop("mutation_scope", mutationScope.statusKo);
  }
  if (
    input.patchKind &&
    !isPatchKindAllowed(input.patchKind, mutationScope.allowedPatchKinds)
  ) {
    return stop("mutation_scope", "이 말로는 그 변경까지는 하지 않아요");
  }

  // 2d. Idempotency — fingerprint + jobId + revision (soft time assist inside gate)
  const scoutPartsPreview = evaluateAgentP0Guards({
    contextEventId,
    utterance,
    patchKind: input.patchKind ?? null,
    lat: input.lat,
    lng: input.lng,
    scoutMode: input.scoutMode,
    classification,
  });
  // Preflight idempotency uses planned fingerprint + current job + revision
  // before commit (same request + same state → no-op).
  const idemKey = buildAgentIdempotencyKey({
    utterance,
    scoutFingerprint: scoutPartsPreview.scoutFingerprint,
    jobId: state?.agentJob?.id ?? null,
    workspaceRevision: readWorkspaceRevision(state),
    patchKind: input.patchKind ?? null,
    toolId: input.toolId ?? null,
  });
  const idem = resolveIdempotencyGate({
    contextEventId,
    key: idemKey,
  });
  if (!idem.ok) {
    return stop("idempotent", idem.statusKo);
  }

  // 3. P0 Job Boundary / Stale (already evaluated above — reuse)
  const p0: AgentP0EvaluateResult = scoutPartsPreview;

  // 4. Constraint Carry-over (per-field inheritance policy)
  const carry = resolveConstraintCarryOver({
    utterance,
    previousBag: state?.constraintMemory,
    switchJob: p0.switchJob,
    previousTarget: state?.agentJob?.target,
    nextTarget: p0.job.target,
  });

  const scoutUtterance = applyConstraintMemoryToScoutQuery(
    utterance,
    carry.bagForScout,
  );

  const statusHintKo =
    [p0.statusHintKo, action.statusKo, carry.statusKo]
      .filter(Boolean)
      .join(" · ") || null;

  const decision: Extract<GuardDecision, { action: "CONTINUE" }> = {
    action: "CONTINUE",
    statusKo: statusHintKo,
  };

  return {
    ok: true,
    decision,
    payload: {
      decision,
      classification,
      actionLevel: action.level,
      allowPrepare: action.allowPrepare,
      discoverOnly: action.discoverOnly,
      job: p0.job,
      switchJob: p0.switchJob,
      abortSoftContinue: p0.abortSoftContinue,
      forceReplaceScout: p0.forceReplaceScout,
      scoutFingerprint: p0.scoutFingerprint,
      allowSoftNextAuto: p0.allowSoftNextAuto,
      stampConstitution: p0.stampConstitution,
      mutationMode: p0.boundary.mutation.mode,
      carry,
      scoutUtterance,
      idempotencyKey: idemKey,
      statusHintKo,
    },
  };
}
