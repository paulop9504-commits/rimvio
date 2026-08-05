/**
 * P1 entry — thin wrapper: evaluate Guard pipeline → commit on CONTINUE.
 * Prefer evaluateAgentGuardPipeline + commitAgentGuardContinue in new Agent Loop code.
 */

import {
  evaluateAgentGuardPipeline,
  type AgentGuardContinuePayload,
} from "@/lib/agent-policy/run-agent-guard-pipeline";
import { commitAgentGuardContinue } from "@/lib/agent-policy/commit-agent-guard-continue";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import type { AgentActionLevel } from "@/lib/agent-policy/action-level-gate";
import type { ConstraintCarryOverResult } from "@/lib/agent-policy/constraint-carry-over";
import type { AgentJob } from "@/lib/agent-policy/agent-job";
import { stampAgentIdempotencyKey } from "@/lib/agent-policy/idempotency-gate";

export type AgentP1GuardBlock = {
  readonly ok: false;
  readonly statusKo: string;
  readonly code:
    | "ambiguity"
    | "action_level"
    | "mutation_scope"
    | "idempotent"
    | "job_interrupt"
    | "ask_clarify";
};

export type AgentP1GuardPass = {
  readonly ok: true;
  readonly job: AgentJob;
  readonly switchJob: boolean;
  readonly abortSoftContinue: boolean;
  readonly forceReplaceScout: boolean;
  readonly scoutFingerprint: string;
  readonly statusHintKo: string | null;
  readonly allowSoftNextAuto: boolean;
  readonly actionLevel: AgentActionLevel;
  readonly allowPrepare: boolean;
  readonly discoverOnly: boolean;
  readonly carry: ConstraintCarryOverResult;
  readonly scoutUtterance: string;
  readonly idempotencyKey: string;
  readonly decision: AgentGuardContinuePayload["decision"];
};

export type AgentP1GuardResult = AgentP1GuardBlock | AgentP1GuardPass;

export function runAgentP1Guards(input: {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly patchKind?: string | null;
  readonly toolId?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly scoutMode?: "replace" | "add" | "refine";
}): AgentP1GuardResult {
  const pipeline = evaluateAgentGuardPipeline(input);
  if (!pipeline.ok) {
    return {
      ok: false,
      code: pipeline.decision.code,
      statusKo: pipeline.decision.statusKo,
    };
  }

  const p = pipeline.payload;
  const state = readContextWorkspace(input.contextEventId.trim());
  commitAgentGuardContinue({
    contextEventId: input.contextEventId,
    utterance: input.utterance,
    job: p.job,
    scoutFingerprint: p.scoutFingerprint,
    abortSoftContinue: p.abortSoftContinue,
    stampConstitution: p.stampConstitution,
    mutationMode: p.mutationMode,
    beforeSummaryKo: state?.summaryKo,
    constraintMemory: p.carry.bagForScout,
  });

  return {
    ok: true,
    job: p.job,
    switchJob: p.switchJob,
    abortSoftContinue: p.abortSoftContinue,
    forceReplaceScout: p.forceReplaceScout,
    scoutFingerprint: p.scoutFingerprint,
    statusHintKo: p.statusHintKo,
    allowSoftNextAuto: p.allowSoftNextAuto,
    actionLevel: p.actionLevel,
    allowPrepare: p.allowPrepare,
    discoverOnly: p.discoverOnly,
    carry: p.carry,
    scoutUtterance: p.scoutUtterance,
    idempotencyKey: p.idempotencyKey,
    decision: p.decision,
  };
}

export { stampAgentIdempotencyKey, evaluateAgentGuardPipeline };
