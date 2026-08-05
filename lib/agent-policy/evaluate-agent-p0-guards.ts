/**
 * Evaluate P0 Job Boundary + Stale — judgment only (no Workspace write).
 * Commit via commitAgentGuardContinue / commitAgentP0Guards.
 */

import {
  beginAgentJob,
  withAgentJobFingerprint,
  type AgentJob,
  type AgentJobIntent,
} from "@/lib/agent-policy/agent-job";
import { classifyAgentJobTurn, type JobTurnClassification } from "@/lib/agent-policy/classify-agent-job-turn";
import {
  buildScoutFingerprintParts,
  fingerprintScoutQuery,
  isScoutFingerprintStale,
} from "@/lib/agent-policy/scout-query-fingerprint";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import type { WorkspaceJobBoundary } from "@/lib/agent-policy/resolve-workspace-job-boundary";

export type AgentP0EvaluateResult = {
  readonly ok: true;
  readonly classification: JobTurnClassification;
  readonly boundary: WorkspaceJobBoundary;
  readonly job: AgentJob;
  readonly switchJob: boolean;
  readonly abortSoftContinue: boolean;
  readonly forceReplaceScout: boolean;
  readonly scoutFingerprint: string;
  readonly statusHintKo: string | null;
  readonly allowSoftNextAuto: boolean;
  readonly stampConstitution: boolean;
};

export function evaluateAgentP0Guards(input: {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly patchKind?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly scoutMode?: "replace" | "add" | "refine";
  /** Optional precomputed classification — avoid re-running Job Boundary. */
  readonly classification?: JobTurnClassification;
}): AgentP0EvaluateResult {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  const state = readContextWorkspace(contextEventId);
  const hasVisible = Boolean(state?.nodes.some((n) => n.visible));

  const classification =
    input.classification ??
    classifyAgentJobTurn({
      utterance,
      hasVisibleCandidates: hasVisible,
      patchKind: input.patchKind ?? null,
      previousJob: state?.agentJob ?? null,
    });

  const boundary = classification.boundary;

  const scoutMode =
    input.scoutMode ??
    (boundary.mutation.mode === "refine"
      ? "refine"
      : boundary.mutation.mode === "replace"
        ? "replace"
        : "replace");

  const parts = buildScoutFingerprintParts({
    utterance,
    mode: scoutMode,
    lat: input.lat,
    lng: input.lng,
  });
  const scoutFingerprint = fingerprintScoutQuery(parts);
  const stale = isScoutFingerprintStale({
    previous: state?.agentJob?.scoutFingerprint ?? state?.lastScoutFingerprint,
    next: scoutFingerprint,
  });

  const forceReplaceScout =
    stale ||
    boundary.mutation.mode === "replace" ||
    boundary.switchJob ||
    input.patchKind === "spatial_constraint" ||
    input.patchKind === "replace_entity";

  let job: AgentJob;
  const prev = state?.agentJob ?? null;
  if (classification.kind === "continue_cue" && prev?.status === "active") {
    job = prev;
  } else if (
    classification.kind === "continue_job" &&
    boundary.mutation.mode === "refine" &&
    prev?.status === "active"
  ) {
    job = withAgentJobFingerprint(
      { ...prev, intent: "refine", lastUtterance: utterance },
      scoutFingerprint,
    );
  } else if (
    classification.kind === "continue_job" &&
    prev?.status === "active"
  ) {
    job = withAgentJobFingerprint(
      { ...prev, lastUtterance: utterance },
      scoutFingerprint,
    );
  } else {
    const intent: AgentJobIntent =
      boundary.mutation.mode === "refine"
        ? "refine"
        : input.patchKind === "create_draft" ||
            /예약\s*준비|prepare/iu.test(utterance)
          ? "prepare"
          : "discover";
    job = beginAgentJob({
      utterance,
      intent,
      target: boundary.nextTarget === "mixed" ? undefined : boundary.nextTarget,
      scoutFingerprint,
    });
  }

  const statusHintKo =
    boundary.statusHintKo ??
    (stale && forceReplaceScout
      ? "조건이 바뀌어서 이전 후보는 버리고 다시 찾았어요"
      : null);

  return {
    ok: true,
    classification,
    boundary,
    job,
    switchJob: boundary.switchJob,
    abortSoftContinue: boundary.abortSoftContinue,
    forceReplaceScout,
    scoutFingerprint,
    statusHintKo,
    allowSoftNextAuto:
      !boundary.switchJob &&
      !boundary.abortSoftContinue &&
      job.scope.allowSoftNextTargets.length > 0,
    stampConstitution:
      boundary.switchJob && boundary.mutation.mode !== "none",
  };
}
