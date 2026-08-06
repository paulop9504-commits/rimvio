/**
 * P0 Agent Trust Guards — Job Boundary · Stale · Scope Lock.
 * Evaluation is pure; this entry commits on success (legacy callers).
 */

import { evaluateAgentP0Guards, type AgentP0EvaluateResult } from "@/lib/agent-policy/evaluate-agent-p0-guards";
import { commitAgentGuardContinue } from "@/lib/agent-policy/commit-agent-guard-continue";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import type { AgentJob } from "@/lib/agent-policy/agent-job";

export type AgentP0GuardResult = {
  readonly ok: true;
  readonly job: AgentJob;
  readonly switchJob: boolean;
  readonly abortSoftContinue: boolean;
  /** Force rescout replace — stale inventory must not be refined in place. */
  readonly forceReplaceScout: boolean;
  readonly scoutFingerprint: string;
  readonly statusHintKo: string | null;
  readonly allowSoftNextAuto: boolean;
};

export function runAgentP0Guards(input: {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly patchKind?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly scoutMode?: "replace" | "add" | "refine";
}): AgentP0GuardResult {
  const evaluated: AgentP0EvaluateResult = evaluateAgentP0Guards(input);
  const state = readContextWorkspace(input.contextEventId.trim());
  commitAgentGuardContinue({
    contextEventId: input.contextEventId,
    utterance: input.utterance,
    job: evaluated.job,
    scoutFingerprint: evaluated.scoutFingerprint,
    abortSoftContinue: evaluated.abortSoftContinue,
    stampConstitution: evaluated.stampConstitution,
    mutationMode: evaluated.boundary.mutation.mode,
    beforeSummaryKo: state?.summaryKo,
  });

  return {
    ok: true,
    job: evaluated.job,
    switchJob: evaluated.switchJob,
    abortSoftContinue: evaluated.abortSoftContinue,
    forceReplaceScout: evaluated.forceReplaceScout,
    scoutFingerprint: evaluated.scoutFingerprint,
    statusHintKo: evaluated.statusHintKo,
    allowSoftNextAuto: evaluated.allowSoftNextAuto,
  };
}

export { evaluateAgentP0Guards };
