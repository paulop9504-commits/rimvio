"use client";

/**
 * Research Execution Timeline walk — Stages 1–10 progress on compose.
 * Does not Commit Reality. Completes after Decision Generation.
 */

import {
  appendContextAgentComposeTurn,
  patchContextAgentComposeTurn,
} from "@/lib/globe/assistant/context-agent-compose-thread-store";
import type { IntentExecutionTimelinePayload } from "@/lib/globe/assistant/context-agent-compose-thread-store";
import type { ResearchStage } from "@/engines/research/schema";
import { RESEARCH_STAGES } from "@/engines/research/schema";
import {
  buildResearchExecutionTimeline,
  researchPipelineCompleteSnapshot,
} from "@/lib/research-engine/build-research-timeline";
import { researchStageProgressKo } from "@/lib/research-engine/progress-copy";

const DEFAULT_STEP_MS = 280;

export type ResearchExecutionWalkHandle = {
  turnId: string;
  stop: () => void;
  /** Advance to a stage (optional external sync with runResearchEngine onStage). */
  setStage: (stage: ResearchStage) => void;
  complete: () => void;
};

function toWirePayload(
  snap: ReturnType<typeof buildResearchExecutionTimeline>,
  status: IntentExecutionTimelinePayload["status"],
): IntentExecutionTimelinePayload {
  return {
    profile: "research",
    currentStage: snap.currentStage,
    status,
    lanes: snap.lanes.map((lane) => ({
      id: lane.id,
      titleKo: lane.titleKo,
      status: lane.status,
      detailKo: lane.detailKo,
      activeStage: lane.activeStage,
    })),
  };
}

export function startResearchExecutionTimelineWalk(input: {
  contextEventId: string;
  stepMs?: number;
  /** When false, only reacts to setStage (driven by runResearchEngine). */
  autoAdvance?: boolean;
}): ResearchExecutionWalkHandle | null {
  const eventId = input.contextEventId.trim();
  if (!eventId || typeof window === "undefined") {
    return null;
  }

  const stepMs = input.stepMs ?? DEFAULT_STEP_MS;
  const autoAdvance = input.autoAdvance !== false;
  let stage: ResearchStage = RESEARCH_STAGES[0]!;
  const snap = buildResearchExecutionTimeline({ currentStage: stage });
  const turn = appendContextAgentComposeTurn(eventId, {
    role: "assistant",
    kind: "execution_timeline",
    text: researchStageProgressKo(stage),
    payload: toWirePayload(snap, "running"),
  });

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const paint = (
    next: ResearchStage,
    status: IntentExecutionTimelinePayload["status"] = "running",
  ) => {
    stage = next;
    const nextSnap =
      status === "complete"
        ? researchPipelineCompleteSnapshot()
        : buildResearchExecutionTimeline({ currentStage: stage });
    patchContextAgentComposeTurn(eventId, turn.id, {
      kind: "execution_timeline",
      text:
        status === "complete"
          ? "Done."
          : researchStageProgressKo(stage),
      payload: toWirePayload(nextSnap, status),
    });
  };

  const tick = () => {
    if (stopped || !autoAdvance) {
      return;
    }
    const idx = RESEARCH_STAGES.indexOf(stage);
    const next = RESEARCH_STAGES[idx + 1];
    if (!next) {
      paint(stage, "complete");
      return;
    }
    paint(next, next === "DECISION_GENERATION" ? "running" : "running");
    if (next === "DECISION_GENERATION") {
      timer = setTimeout(() => {
        if (!stopped) {
          paint(next, "complete");
        }
      }, stepMs);
      return;
    }
    timer = setTimeout(tick, stepMs);
  };

  if (autoAdvance) {
    timer = setTimeout(tick, stepMs);
  }

  return {
    turnId: turn.id,
    stop: () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
    },
    setStage: (next) => {
      if (stopped) {
        return;
      }
      paint(next, "running");
    },
    complete: () => {
      if (stopped) {
        return;
      }
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
      paint("DECISION_GENERATION", "complete");
    },
  };
}
