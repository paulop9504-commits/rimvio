import {
  AUTO_ADVANCE_UNTIL_STAGE,
  TRIP_REVISE_STAGE_PIPELINE,
  nextStageInPipeline,
  type AgentStage,
  type IntentExecutionProfile,
} from "@/lib/intent-engine/agent-stage";
import { buildIntentExecutionTimeline } from "@/lib/intent-engine/build-intent-execution-timeline";
import { stageProgressKo } from "@/lib/intent-engine/agent-stage-copy";
import {
  appendContextAgentComposeTurn,
  patchContextAgentComposeTurn,
  readContextAgentComposeThread,
} from "@/lib/globe/assistant/context-agent-compose-thread-store";
import type { IntentExecutionTimelinePayload } from "@/lib/globe/assistant/context-agent-compose-thread-store";

const DEFAULT_STEP_MS = 420;

export type IntentExecutionWalkHandle = {
  turnId: string;
  stop: () => void;
};

/**
 * Append Execution Timeline turn and auto-advance stages until WAIT_APPROVAL.
 * Does not Commit — human gate only.
 */
export function startIntentExecutionTimelineWalk(input: {
  contextEventId: string;
  profile?: IntentExecutionProfile;
  stepMs?: number;
  onStage?: (stage: AgentStage) => void;
}): IntentExecutionWalkHandle | null {
  const eventId = input.contextEventId.trim();
  if (!eventId || typeof window === "undefined") {
    return null;
  }

  const profile = input.profile ?? "trip_revise";
  const pipeline =
    profile === "trip_revise" ? TRIP_REVISE_STAGE_PIPELINE : TRIP_REVISE_STAGE_PIPELINE;
  const stepMs = input.stepMs ?? DEFAULT_STEP_MS;

  let stage: AgentStage = pipeline[0] ?? "UNDERSTAND_INTENT";
  const snapshot = buildIntentExecutionTimeline({ currentStage: stage, profile });
  const turn = appendContextAgentComposeTurn(eventId, {
    role: "assistant",
    kind: "execution_timeline",
    text: stageProgressKo(stage),
    payload: {
      profile,
      currentStage: stage,
      lanes: snapshot.lanes,
      status: "running",
    },
  });

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const tick = () => {
    if (stopped) {
      return;
    }
    const next = nextStageInPipeline(pipeline, stage);
    if (!next) {
      return;
    }
    stage = next;
    input.onStage?.(stage);
    const nextSnap = buildIntentExecutionTimeline({ currentStage: stage, profile });
    const waiting = stage === AUTO_ADVANCE_UNTIL_STAGE;
    patchContextAgentComposeTurn(eventId, turn.id, {
      kind: "execution_timeline",
      text: stageProgressKo(stage),
      payload: {
        profile,
        currentStage: stage,
        lanes: nextSnap.lanes,
        status: waiting ? "waiting_approval" : "running",
      },
    });
    if (waiting) {
      return;
    }
    timer = setTimeout(tick, stepMs);
  };

  input.onStage?.(stage);
  timer = setTimeout(tick, stepMs);

  return {
    turnId: turn.id,
    stop: () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
    },
  };
}

/** Mark timeline complete after human approval / commit elsewhere. */
export function completeIntentExecutionTimeline(
  contextEventId: string,
  turnId?: string,
): void {
  const eventId = contextEventId.trim();
  if (!eventId) {
    return;
  }
  const rows = readContextAgentComposeThread(eventId);
  const target =
    (turnId
      ? rows.find((r) => r.id === turnId)
      : [...rows]
          .reverse()
          .find(
            (r) =>
              r.role === "assistant" &&
              r.kind === "execution_timeline" &&
              r.payload.status !== "complete",
          )) ?? null;
  if (!target || target.role !== "assistant" || target.kind !== "execution_timeline") {
    return;
  }
  const snap = buildIntentExecutionTimeline({
    currentStage: "COMPLETE",
    profile: target.payload.profile,
  });
  patchContextAgentComposeTurn(eventId, target.id, {
    kind: "execution_timeline",
    text: stageProgressKo("COMPLETE"),
    payload: {
      ...target.payload,
      currentStage: "COMPLETE",
      lanes: snap.lanes,
      status: "complete",
    } satisfies IntentExecutionTimelinePayload,
  });
}
