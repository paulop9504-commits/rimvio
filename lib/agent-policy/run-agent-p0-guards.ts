/**
 * P0 Agent Trust Guards — single entry before Tool / Patch mutate Workspace.
 *
 * ① Anchor Fail-Closed (caller still runs gateNear — this records/enforces policy)
 * ② Job Boundary
 * ③ Scope Lock (soft-next / patch allowance)
 * ④ Stale Result Invalidation
 */

import {
  beginAgentJob,
  withAgentJobFingerprint,
  type AgentJob,
  type AgentJobIntent,
} from "@/lib/agent-policy/agent-job";
import { resolveWorkspaceJobBoundary } from "@/lib/agent-policy/resolve-workspace-job-boundary";
import {
  buildScoutFingerprintParts,
  fingerprintScoutQuery,
  isScoutFingerprintStale,
} from "@/lib/agent-policy/scout-query-fingerprint";
import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import { bumpSoftNextWorkGeneration } from "@/lib/workstream/offer-soft-next-work-after-act";
import { stampAgentConstitutionOnWorkspace } from "@/lib/agent-policy/stamp-constitution-on-workspace";

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
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  const state = readContextWorkspace(contextEventId);
  const hasVisible = Boolean(state?.nodes.some((n) => n.visible));

  const boundary = resolveWorkspaceJobBoundary({
    utterance,
    hasVisibleCandidates: hasVisible,
    patchKind: input.patchKind ?? null,
    previousJob: state?.agentJob ?? null,
  });

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

  if (boundary.abortSoftContinue) {
    bumpSoftNextWorkGeneration(contextEventId);
  }

  let job: AgentJob;
  const prev = state?.agentJob ?? null;
  if (boundary.isContinueCue && prev?.status === "active") {
    job = prev;
  } else if (
    !boundary.switchJob &&
    boundary.mutation.mode === "refine" &&
    prev?.status === "active"
  ) {
    job = withAgentJobFingerprint(
      { ...prev, intent: "refine", lastUtterance: utterance },
      scoutFingerprint,
    );
  } else {
    const intent: AgentJobIntent = boundary.mutation.mode === "refine"
      ? "refine"
      : input.patchKind === "create_draft" || /예약\s*준비|prepare/iu.test(utterance)
        ? "prepare"
        : "discover";
    job = beginAgentJob({
      utterance,
      intent,
      target: boundary.nextTarget === "mixed" ? undefined : boundary.nextTarget,
      scoutFingerprint,
    });
  }

  if (state) {
    writeContextWorkspace({
      ...state,
      agentJob: job,
      lastScoutFingerprint: scoutFingerprint,
      updatedAtIso: new Date().toISOString(),
    });
  }

  if (boundary.switchJob && boundary.mutation.mode !== "none") {
    stampAgentConstitutionOnWorkspace({
      contextEventId,
      utterance,
      mutationMode: boundary.mutation.mode,
      beforeSummaryKo: state?.summaryKo,
    });
  }

  const statusHintKo =
    boundary.statusHintKo ??
    (stale && forceReplaceScout
      ? "조건이 바뀌어서 이전 후보는 버리고 다시 찾았어요"
      : null);

  return {
    ok: true,
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
  };
}
