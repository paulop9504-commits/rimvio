/**
 * Research Engine stages — never skip (constitution).
 */

import {
  RESEARCH_ENGINE_VERSION,
  RESEARCH_STAGES,
  type ResearchStage,
} from "@/engines/research/schema";

export { RESEARCH_ENGINE_VERSION, RESEARCH_STAGES, type ResearchStage };

/** UI / compose lanes for research timeline (not raw 10-stage dump). */
export const RESEARCH_LANES = [
  "intent",
  "scan",
  "rank",
  "deep",
  "evidence",
  "decision",
] as const;

export type ResearchLaneId = (typeof RESEARCH_LANES)[number];

export type ResearchLaneStatus =
  | "pending"
  | "in_progress"
  | "done"
  | "waiting";

export function researchStageIndex(stage: ResearchStage): number {
  return RESEARCH_STAGES.indexOf(stage);
}

export function laneForResearchStage(stage: ResearchStage): ResearchLaneId {
  switch (stage) {
    case "UNDERSTAND_INTENT":
    case "EXPAND_SEARCH_QUERY":
    case "BUILD_RESEARCH_PLAN":
      return "intent";
    case "FAST_SCAN":
      return "scan";
    case "CANDIDATE_RANKING":
      return "rank";
    case "DEEP_RESEARCH":
      return "deep";
    case "EVIDENCE_MERGE":
    case "CONFLICT_DETECTION":
    case "CONFIDENCE_SCORING":
      return "evidence";
    case "DECISION_GENERATION":
      return "decision";
  }
}

export function stagesForResearchLane(
  lane: ResearchLaneId,
): readonly ResearchStage[] {
  switch (lane) {
    case "intent":
      return [
        "UNDERSTAND_INTENT",
        "EXPAND_SEARCH_QUERY",
        "BUILD_RESEARCH_PLAN",
      ];
    case "scan":
      return ["FAST_SCAN"];
    case "rank":
      return ["CANDIDATE_RANKING"];
    case "deep":
      return ["DEEP_RESEARCH"];
    case "evidence":
      return [
        "EVIDENCE_MERGE",
        "CONFLICT_DETECTION",
        "CONFIDENCE_SCORING",
      ];
    case "decision":
      return ["DECISION_GENERATION"];
  }
}

export function nextResearchStage(
  current: ResearchStage,
): ResearchStage | null {
  const idx = RESEARCH_STAGES.indexOf(current);
  if (idx < 0) {
    return RESEARCH_STAGES[0] ?? null;
  }
  return RESEARCH_STAGES[idx + 1] ?? null;
}
