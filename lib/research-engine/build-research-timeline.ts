import {
  RESEARCH_LANES,
  laneForResearchStage,
  nextResearchStage,
  researchStageIndex,
  stagesForResearchLane,
  type ResearchLaneId,
  type ResearchLaneStatus,
} from "@/lib/research-engine/stages";
import {
  RESEARCH_LANE_TITLE_KO,
  researchStageProgressKo,
} from "@/lib/research-engine/progress-copy";
import type { ResearchStage } from "@/engines/research/schema";
import { RESEARCH_STAGES } from "@/engines/research/schema";

export type ResearchTimelineLaneRow = {
  id: ResearchLaneId;
  titleKo: string;
  status: ResearchLaneStatus;
  detailKo: string;
  activeStage: ResearchStage | null;
};

export type ResearchExecutionTimelineSnapshot = {
  profile: "research";
  currentStage: ResearchStage;
  lanes: readonly ResearchTimelineLaneRow[];
};

export function buildResearchExecutionTimeline(input: {
  currentStage: ResearchStage;
}): ResearchExecutionTimelineSnapshot {
  const current = input.currentStage;
  const currentIdx = researchStageIndex(current);
  const activeLane = laneForResearchStage(current);
  const activeLaneIdx = RESEARCH_LANES.indexOf(activeLane);

  const lanes: ResearchTimelineLaneRow[] = RESEARCH_LANES.map((laneId, laneIdx) => {
    const laneStages = stagesForResearchLane(laneId);
    const lastStage = laneStages[laneStages.length - 1]!;
    const lastIdx = researchStageIndex(lastStage);

    if (activeLaneIdx >= 0 && laneIdx < activeLaneIdx) {
      return {
        id: laneId,
        titleKo: RESEARCH_LANE_TITLE_KO[laneId],
        status: "done" as const,
        detailKo: "완료",
        activeStage: null,
      };
    }
    if (laneId === activeLane) {
      const doneInLane = laneStages.every(
        (s) => researchStageIndex(s) < currentIdx,
      );
      if (doneInLane || lastIdx < currentIdx) {
        return {
          id: laneId,
          titleKo: RESEARCH_LANE_TITLE_KO[laneId],
          status: "done" as const,
          detailKo: "완료",
          activeStage: null,
        };
      }
      return {
        id: laneId,
        titleKo: RESEARCH_LANE_TITLE_KO[laneId],
        status: "in_progress" as const,
        detailKo: researchStageProgressKo(current),
        activeStage: current,
      };
    }
    return {
      id: laneId,
      titleKo: RESEARCH_LANE_TITLE_KO[laneId],
      status: "pending" as const,
      detailKo: "대기 중",
      activeStage: null,
    };
  });

  return { profile: "research", currentStage: current, lanes };
}

export function researchPipelineCompleteSnapshot(): ResearchExecutionTimelineSnapshot {
  return {
    profile: "research",
    currentStage: "DECISION_GENERATION",
    lanes: RESEARCH_LANES.map((laneId) => ({
      id: laneId,
      titleKo: RESEARCH_LANE_TITLE_KO[laneId],
      status: "done" as const,
      detailKo: laneId === "decision" ? "Done." : "완료",
      activeStage: null,
    })),
  };
}

export { RESEARCH_STAGES, nextResearchStage };
