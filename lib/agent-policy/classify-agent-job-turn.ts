/**
 * Job Classification — BEFORE P1 Preflight.
 * Know CONTINUE vs NEW JOB before deciding which Context may ride along.
 */

import {
  resolveWorkspaceJobBoundary,
  type WorkspaceJobBoundary,
} from "@/lib/agent-policy/resolve-workspace-job-boundary";
import type { AgentJob } from "@/lib/agent-policy/agent-job";

export type JobTurnClassification =
  | {
      readonly kind: "continue_cue";
      readonly previousJob: AgentJob | null;
      readonly boundary: WorkspaceJobBoundary;
    }
  | {
      readonly kind: "continue_job";
      readonly previousJob: AgentJob;
      readonly boundary: WorkspaceJobBoundary;
    }
  | {
      readonly kind: "new_job";
      readonly previousJob: AgentJob | null;
      readonly boundary: WorkspaceJobBoundary;
      readonly reason:
        | "clear"
        | "target_pivot"
        | "spatial"
        | "interrupt"
        | "fresh"
        | "replace";
    };

/**
 * Classify whether this utterance continues Job A or opens Job B.
 */
export function classifyAgentJobTurn(input: {
  readonly utterance: string;
  readonly hasVisibleCandidates: boolean;
  readonly patchKind?: string | null;
  readonly previousJob?: AgentJob | null;
}): JobTurnClassification {
  const boundary = resolveWorkspaceJobBoundary({
    utterance: input.utterance,
    hasVisibleCandidates: input.hasVisibleCandidates,
    patchKind: input.patchKind ?? null,
    previousJob: input.previousJob ?? null,
  });

  const prev = input.previousJob ?? null;

  if (boundary.isContinueCue) {
    return {
      kind: "continue_cue",
      previousJob: prev,
      boundary,
    };
  }

  if (
    !boundary.switchJob &&
    boundary.mutation.mode === "refine" &&
    prev?.status === "active"
  ) {
    return {
      kind: "continue_job",
      previousJob: prev,
      boundary,
    };
  }

  if (!boundary.switchJob && prev?.status === "active") {
    return {
      kind: "continue_job",
      previousJob: prev,
      boundary,
    };
  }

  type NewJobReason = Extract<JobTurnClassification, { kind: "new_job" }>["reason"];
  let reason: NewJobReason = "fresh";
  if (boundary.mutation.reason === "clear_location" || /역\s*근처|근처|주변/u.test(input.utterance)) {
    reason = "spatial";
  }
  if (
    boundary.statusHintKo?.includes("대상") ||
    (prev &&
      boundary.nextTarget !== "mixed" &&
      prev.target !== boundary.nextTarget)
  ) {
    reason = "target_pivot";
  }
  if (/^(?:아니|그만|중단)/u.test(input.utterance.trim())) {
    reason = "interrupt";
  }
  if (boundary.mutation.mode === "replace") {
    reason = reason === "fresh" ? "replace" : reason;
  }
  if (!prev) reason = "fresh";

  return {
    kind: "new_job",
    previousJob: prev,
    boundary,
    reason,
  };
}
