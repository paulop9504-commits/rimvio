import type { ResearchStage } from "@/engines/research/schema";
import type { ResearchLaneId } from "@/lib/research-engine/stages";

export const RESEARCH_LANE_TITLE_KO: Record<ResearchLaneId, string> = {
  intent: "의도·계획",
  scan: "빠른 스캔",
  rank: "후보 순위",
  deep: "심층 조사",
  evidence: "증거 병합",
  decision: "추천 준비",
};

export const RESEARCH_STAGE_PROGRESS_KO: Record<ResearchStage, string> = {
  UNDERSTAND_INTENT: "Understanding your request...",
  EXPAND_SEARCH_QUERY: "Expanding search queries...",
  BUILD_RESEARCH_PLAN: "Planning research...",
  FAST_SCAN: "Scanning search results...",
  CANDIDATE_RANKING: "Ranking candidates...",
  DEEP_RESEARCH: "Reading high quality sources...",
  EVIDENCE_MERGE: "Comparing evidence...",
  CONFLICT_DETECTION: "Detecting conflicts...",
  CONFIDENCE_SCORING: "Calculating confidence...",
  DECISION_GENERATION: "Generating recommendation...",
};

/** User-facing KO progress (compose timeline text). */
export const RESEARCH_STAGE_PROGRESS_USER_KO: Record<ResearchStage, string> = {
  UNDERSTAND_INTENT: "요청을 이해하고 있어요…",
  EXPAND_SEARCH_QUERY: "검색어를 넓히고 있어요…",
  BUILD_RESEARCH_PLAN: "조사 계획을 짜고 있어요…",
  FAST_SCAN: "결과 제목·요약을 훑고 있어요…",
  CANDIDATE_RANKING: "후보를 가려내고 있어요…",
  DEEP_RESEARCH: "유력 출처를 자세히 읽고 있어요…",
  EVIDENCE_MERGE: "증거를 맞춰 보고 있어요…",
  CONFLICT_DETECTION: "서로 다른 주장을 찾고 있어요…",
  CONFIDENCE_SCORING: "신뢰도를 계산하고 있어요…",
  DECISION_GENERATION: "추천을 준비하고 있어요…",
};

export function researchStageProgressKo(stage: ResearchStage): string {
  return RESEARCH_STAGE_PROGRESS_USER_KO[stage];
}
