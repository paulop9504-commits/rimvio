/**
 * Job boundary — prevent Task A inertia from stealing Task B.
 * Soft refine = same job; clear/spatial/interrupt/target-pivot = switch job.
 */

import {
  resolveWorkspaceMutationMode,
  type WorkspaceMutationDecision,
} from "@/lib/agent-policy/resolve-workspace-mutation-mode";
import {
  resolveAgentJobTargetFromUtterance,
  type AgentJob,
} from "@/lib/agent-policy/agent-job";
import { parseWorkspacePatch } from "@/lib/context-workspace/workspace-patch";

export type WorkspaceJobBoundary = {
  /** True when this utterance starts a new job (or interrupts A). */
  readonly switchJob: boolean;
  /** Kill soft-next / dock auto「계속해」from the previous job. */
  readonly abortSoftContinue: boolean;
  readonly mutation: WorkspaceMutationDecision;
  /** Optional one-line for chat / Agent status. */
  readonly statusHintKo: string | null;
  /** Soft 「계속해」chain — never switch job. */
  readonly isContinueCue: boolean;
  /** Resolved Target for this turn (for persist). */
  readonly nextTarget: ReturnType<typeof resolveAgentJobTargetFromUtterance>;
};

const CONTINUE_CUE_RE = /^(?:계속해|이어서|다음(?:으로)?|continue)$/iu;

/** Explicit stop / pivot away from current auto chain. */
const INTERRUPT_RE =
  /^(?:아니(?:야|오)?|그만|중단|스톱|stop|cancel)|그거\s*말고|그건\s*말고|다른\s*(?:일|거|작업)|대신\s|새\s*작업|그만해|하지\s*마/iu;

/** Any named station / near-pivot — clear location even if city hardcodes missed. */
const SPATIAL_NEAR_RE =
  /([가-힣A-Za-z0-9·]+역)\s*(?:근처|주변|앞)|(?:근처|주변)\s*(?:호텔|숙소|맛집)|쪽으로|중심으로|근처로|주변으로/iu;

/** 「맛집도 찾아줘」 — Target switch even without near/replace words. */
const TARGET_STACK_RE =
  /(?:맛집|호텔|숙소|카페|놀거리|관광|약국)도|(?:그리고|또)\s*(?:맛집|호텔|숙소|카페|놀거리)/iu;

/**
 * Classify whether this turn continues Job A or switches to Job B.
 */
export function resolveWorkspaceJobBoundary(input: {
  readonly utterance: string;
  readonly hasVisibleCandidates: boolean;
  readonly patchKind?: string | null;
  /** Active Job on Workspace — Target pivot detection. */
  readonly previousJob?: AgentJob | null;
}): WorkspaceJobBoundary {
  const text = input.utterance.trim();
  const nextTarget = resolveAgentJobTargetFromUtterance(text);
  if (!text) {
    return {
      switchJob: false,
      abortSoftContinue: false,
      mutation: { mode: "none", reason: "none", replyHintKo: null },
      statusHintKo: null,
      isContinueCue: false,
      nextTarget,
    };
  }

  if (CONTINUE_CUE_RE.test(text)) {
    return {
      switchJob: false,
      abortSoftContinue: false,
      mutation: { mode: "none", reason: "none", replyHintKo: null },
      statusHintKo: null,
      isContinueCue: true,
      nextTarget: input.previousJob?.target ?? nextTarget,
    };
  }

  let mutation = resolveWorkspaceMutationMode({
    utterance: text,
    hasVisibleCandidates: input.hasVisibleCandidates,
  });

  const patch =
    input.patchKind != null
      ? null
      : parseWorkspacePatch(text);
  const patchKind = input.patchKind ?? patch?.kind ?? null;

  const spatialClear =
    patchKind === "spatial_constraint" || SPATIAL_NEAR_RE.test(text);
  const interrupt = INTERRUPT_RE.test(text);

  const prev = input.previousJob;
  const targetPivot =
    Boolean(prev && prev.status === "active") &&
    nextTarget !== "mixed" &&
    prev!.target !== "mixed" &&
    nextTarget !== prev!.target &&
    (TARGET_STACK_RE.test(text) ||
      /맛집|식당|카페|호텔|숙소|놀거리|관광|약국/iu.test(text));

  if (spatialClear && mutation.mode !== "replace") {
    mutation = {
      mode: "replace",
      reason: "clear_location",
      replyHintKo: "위치를 반영해 후보를 다시 찾았어요",
    };
  }

  if ((interrupt || targetPivot) && mutation.mode === "none") {
    mutation = {
      mode: "replace",
      reason: "clear_research",
      replyHintKo: targetPivot
        ? "찾는 대상을 바꿔서 새로 진행할게요"
        : "이전 요청은 멈추고 새로 진행할게요",
    };
  }

  // Soft refine stays Job A — do not abort (user may still want soft next later).
  if (
    mutation.mode === "refine" &&
    !interrupt &&
    !spatialClear &&
    !targetPivot
  ) {
    return {
      switchJob: false,
      abortSoftContinue: false,
      mutation,
      statusHintKo: null,
      isContinueCue: false,
      nextTarget,
    };
  }

  const switchJob =
    interrupt ||
    spatialClear ||
    targetPivot ||
    mutation.mode === "replace" ||
    patchKind === "replace_entity";

  return {
    switchJob,
    abortSoftContinue: switchJob,
    mutation,
    statusHintKo: switchJob
      ? interrupt
        ? "이전 이어서 하던 일은 멈췄어요"
        : targetPivot
          ? "대상을 바꿔 새 작업으로 바꿨어요"
          : "새 요청으로 바꿨어요 · 이전 자동 이어하기는 취소했어요"
      : null,
    isContinueCue: false,
    nextTarget,
  };
}
