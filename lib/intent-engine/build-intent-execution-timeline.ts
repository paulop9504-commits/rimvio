import {
  EXECUTION_LANES,
  laneForStage,
  stageIndex,
  stagesForLane,
  type AgentStage,
  type ExecutionLaneStatus,
  type IntentExecutionProfile,
} from "@/lib/intent-engine/agent-stage";
import {
  EXECUTION_LANE_DONE_KO,
  EXECUTION_LANE_TITLE_KO,
  stageProgressKo,
} from "@/lib/intent-engine/agent-stage-copy";

export type ExecutionTimelineLaneRow = {
  id: (typeof EXECUTION_LANES)[number];
  titleKo: string;
  status: ExecutionLaneStatus;
  detailKo: string;
  activeStage: AgentStage | null;
};

export type IntentExecutionTimelineSnapshot = {
  profile: IntentExecutionProfile;
  currentStage: AgentStage;
  lanes: readonly ExecutionTimelineLaneRow[];
};

/**
 * Build Execution Timeline from current AgentStage.
 * Every internal stage maps to one human-readable lane detail.
 */
export function buildIntentExecutionTimeline(input: {
  currentStage: AgentStage;
  profile?: IntentExecutionProfile;
}): IntentExecutionTimelineSnapshot {
  const profile = input.profile ?? "generic";
  const current = input.currentStage;
  const currentIdx = stageIndex(current);
  const activeLane = laneForStage(current);
  const activeLaneIdx = activeLane ? EXECUTION_LANES.indexOf(activeLane) : -1;

  const lanes: ExecutionTimelineLaneRow[] = EXECUTION_LANES.map((laneId, laneIdx) => {
    const laneStages = stagesForLane(laneId);
    const lastStage = laneStages[laneStages.length - 1]!;
    const lastIdx = stageIndex(lastStage);

    if (current === "IDLE") {
      return {
        id: laneId,
        titleKo: EXECUTION_LANE_TITLE_KO[laneId],
        status: "pending" as const,
        detailKo: "대기 중",
        activeStage: null,
      };
    }

    if (current === "COMPLETE" || (activeLaneIdx >= 0 && laneIdx < activeLaneIdx)) {
      return {
        id: laneId,
        titleKo: EXECUTION_LANE_TITLE_KO[laneId],
        status: "done" as const,
        detailKo: EXECUTION_LANE_DONE_KO[laneId][profile],
        activeStage: null,
      };
    }

    if (laneId === activeLane) {
      if (current === "WAIT_APPROVAL") {
        return {
          id: laneId,
          titleKo: EXECUTION_LANE_TITLE_KO[laneId],
          status: "waiting" as const,
          detailKo: stageProgressKo("WAIT_APPROVAL"),
          activeStage: "WAIT_APPROVAL",
        };
      }
      if (current === "COMMIT" || currentIdx > lastIdx) {
        return {
          id: laneId,
          titleKo: EXECUTION_LANE_TITLE_KO[laneId],
          status: "done" as const,
          detailKo: EXECUTION_LANE_DONE_KO[laneId][profile],
          activeStage: null,
        };
      }
      return {
        id: laneId,
        titleKo: EXECUTION_LANE_TITLE_KO[laneId],
        status: "in_progress" as const,
        detailKo: stageProgressKo(current),
        activeStage: current,
      };
    }

    return {
      id: laneId,
      titleKo: EXECUTION_LANE_TITLE_KO[laneId],
      status: "pending" as const,
      detailKo: "대기 중",
      activeStage: null,
    };
  });

  return {
    profile,
    currentStage: current,
    lanes,
  };
}
