import type { IntentExecutionProfile } from "@/lib/intent-engine/agent-stage";
import { stageProgressKo } from "@/lib/intent-engine/agent-stage-copy";
import { agentStageForResolutionPhase } from "@/lib/resolution/map-agent-stage";
import {
  buildResolutionTimeline,
} from "@/lib/resolution/build-resolution-timeline";
import {
  RESOLUTION_WALK_PIPELINE,
} from "@/lib/resolution/map-agent-stage";
import {
  runResolutionPipeline,
} from "@/lib/resolution/run-resolution-pipeline";
import type { ResolutionPhase } from "@/lib/resolution/types";
import {
  appendContextAgentComposeTurn,
  patchContextAgentComposeTurn,
  readContextAgentComposeThread,
  type IntentExecutionTimelinePayload,
} from "@/lib/globe/assistant/context-agent-compose-thread-store";
import { findEventCandidate } from "@/lib/events/event-store";
import { readIntentBlueprintFromEvent } from "@/lib/intent-engine/intent-blueprint-metadata";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";

const DEFAULT_STEP_MS = 420;

export type IntentExecutionWalkHandle = {
  turnId: string;
  stop: () => void;
};

function timelinePayloadFromResolution(input: {
  profile: IntentExecutionProfile;
  phase: ResolutionPhase;
  text: string;
  contextEventId: string;
}): IntentExecutionTimelinePayload {
  const event = findEventCandidate(input.contextEventId);
  const brain = event ? buildTravelBrainState(event) : null;
  const blueprint = event ? readIntentBlueprintFromEvent(event) : null;

  const bundle = runResolutionPipeline({
    text: input.text,
    contextEventId: input.contextEventId,
    destinationLabel: brain?.destinationLabel ?? event?.place ?? null,
    companionMode: brain?.slots.companion_mode.value ?? null,
    hasActivePlan: Boolean(event?.metadata?.executionPlan),
    blueprint,
  });

  const snap = buildResolutionTimeline(bundle, input.phase);
  const agentStage = agentStageForResolutionPhase(input.phase);

  return {
    profile: input.profile,
    currentStage: agentStage,
    lanes: snap.lanes.map((lane) => ({
      id: lane.id,
      titleKo: lane.titleKo,
      status:
        lane.status === "skipped"
          ? "pending"
          : lane.status === "waiting"
            ? "waiting"
            : lane.status === "in_progress"
              ? "in_progress"
              : lane.status === "done"
                ? "done"
                : "pending",
      detailKo: lane.detailKo,
      activeStage: lane.status === "in_progress" || lane.status === "waiting" ? agentStage : null,
    })),
    status:
      input.phase === "execution" && snap.waitingApproval
        ? "waiting_approval"
        : "running",
  };
}

/**
 * Append Execution Timeline and walk Resolution phases until Execution / approval.
 * Does not Commit Reality.
 */
export function startIntentExecutionTimelineWalk(input: {
  contextEventId: string;
  profile?: IntentExecutionProfile;
  stepMs?: number;
  sourceText?: string;
  onPhase?: (phase: ResolutionPhase) => void;
}): IntentExecutionWalkHandle | null {
  const eventId = input.contextEventId.trim();
  if (!eventId || typeof window === "undefined") {
    return null;
  }

  const profile = input.profile ?? "trip_revise";
  const stepMs = input.stepMs ?? DEFAULT_STEP_MS;
  const event = findEventCandidate(eventId);
  const sourceText =
    input.sourceText?.trim() ||
    (typeof event?.metadata?.sourceMessage === "string"
      ? event.metadata.sourceMessage
      : "") ||
    event?.title ||
    "여행 수정";

  const pipeline = RESOLUTION_WALK_PIPELINE;
  let phaseIndex = 0;
  let phase = pipeline[0]!;

  const initialPayload = timelinePayloadFromResolution({
    profile,
    phase,
    text: sourceText,
    contextEventId: eventId,
  });

  const turn = appendContextAgentComposeTurn(eventId, {
    role: "assistant",
    kind: "execution_timeline",
    text: initialPayload.lanes.find((l) => l.status === "in_progress")?.detailKo ??
      stageProgressKo("UNDERSTAND_INTENT"),
    payload: initialPayload,
  });

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const tick = () => {
    if (stopped) {
      return;
    }
    const nextIndex = phaseIndex + 1;
    if (nextIndex >= pipeline.length) {
      return;
    }
    phaseIndex = nextIndex;
    phase = pipeline[phaseIndex]!;
    input.onPhase?.(phase);

    const payload = timelinePayloadFromResolution({
      profile,
      phase,
      text: sourceText,
      contextEventId: eventId,
    });

    patchContextAgentComposeTurn(eventId, turn.id, {
      kind: "execution_timeline",
      text:
        payload.lanes.find((l) => l.status === "in_progress" || l.status === "waiting")
          ?.detailKo ?? payload.currentStage,
      payload,
    });

    if (phase === "execution") {
      return;
    }
    timer = setTimeout(tick, stepMs);
  };

  input.onPhase?.(phase);
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

  const event = findEventCandidate(eventId);
  const sourceText =
    (typeof event?.metadata?.sourceMessage === "string"
      ? event.metadata.sourceMessage
      : "") ||
    event?.title ||
    target.text;

  const payload = timelinePayloadFromResolution({
    profile:
      target.payload.profile === "research"
        ? "generic"
        : target.payload.profile,
    phase: "execution",
    text: sourceText,
    contextEventId: eventId,
  });

  const doneLanes = payload.lanes.map((lane) => ({
    ...lane,
    status: "done" as const,
    detailKo: lane.status === "waiting" ? "승인 후 반영 준비가 끝났습니다." : lane.detailKo,
    activeStage: null,
  }));

  patchContextAgentComposeTurn(eventId, target.id, {
    kind: "execution_timeline",
    text: "완료",
    payload: {
      ...payload,
      lanes: doneLanes,
      status: "complete",
      currentStage: "COMPLETE",
    },
  });
}
