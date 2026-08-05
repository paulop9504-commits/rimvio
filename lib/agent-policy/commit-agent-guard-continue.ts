/**
 * Commit Guard CONTINUE side effects — only Agent Loop / thin wrappers call this.
 * Guards evaluate; this writes Job · fingerprint · constraint bag · soft abort.
 */

import type { AgentJob } from "@/lib/agent-policy/agent-job";
import type { ConstraintMemoryBag } from "@/lib/agent-policy/constraint-memory";
import { stampAgentConstitutionOnWorkspace } from "@/lib/agent-policy/stamp-constitution-on-workspace";
import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import { bumpSoftNextWorkGeneration } from "@/lib/workstream/offer-soft-next-work-after-act";
import type { WorkspaceMutationMode } from "@/lib/agent-policy/cursor-agent-policy";

export type AgentGuardCommitInput = {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly job: AgentJob;
  readonly scoutFingerprint: string;
  readonly abortSoftContinue: boolean;
  readonly stampConstitution: boolean;
  readonly mutationMode: WorkspaceMutationMode;
  readonly beforeSummaryKo?: string | null;
  readonly constraintMemory?: ConstraintMemoryBag | null;
};

/**
 * Persist Job Boundary / carry-over decisions after GuardDecision CONTINUE.
 */
export function commitAgentGuardContinue(
  input: AgentGuardCommitInput,
): void {
  const contextEventId = input.contextEventId.trim();
  if (input.abortSoftContinue) {
    bumpSoftNextWorkGeneration(contextEventId);
  }

  const state = readContextWorkspace(contextEventId);
  if (state) {
    writeContextWorkspace({
      ...state,
      agentJob: input.job,
      lastScoutFingerprint: input.scoutFingerprint,
      ...(input.constraintMemory
        ? { constraintMemory: input.constraintMemory }
        : {}),
      updatedAtIso: new Date().toISOString(),
    });
  }

  if (input.stampConstitution && input.mutationMode !== "none") {
    stampAgentConstitutionOnWorkspace({
      contextEventId,
      utterance: input.utterance,
      mutationMode: input.mutationMode,
      beforeSummaryKo: input.beforeSummaryKo ?? state?.summaryKo,
    });
  }
}
