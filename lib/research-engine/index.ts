export {
  RESEARCH_ENGINE_VERSION,
  RESEARCH_STAGES,
  type ResearchStage,
  type FastScanCandidate,
  type RankedCandidate,
  type DeepResearchExtract,
  type EvidenceMerge,
  type ResearchDecision,
  type ResearchResult,
  type ResearchPlanStep,
} from "@/engines/research/schema";

export {
  RESEARCH_LANES,
  laneForResearchStage,
  nextResearchStage,
  researchStageIndex,
  type ResearchLaneId,
} from "@/lib/research-engine/stages";

export {
  researchStageProgressKo,
  RESEARCH_STAGE_PROGRESS_KO,
  RESEARCH_LANE_TITLE_KO,
} from "@/lib/research-engine/progress-copy";

export {
  createFixtureCandidateProvider,
  candidatesFromInventorySnippets,
  mergeProviders,
  type ResearchCandidateProvider,
} from "@/lib/research-engine/providers";

export { createDiscoveryBatchCandidateProvider } from "@/lib/research-engine/discovery-batch-provider";

export {
  runResearchEngine,
  formatResearchResultComposeKo,
  type RunResearchEngineInput,
} from "@/lib/research-engine/run-research-engine";

export { isResearchUtterance } from "@/lib/research-engine/is-research-utterance";

export {
  buildResearchExecutionTimeline,
  researchPipelineCompleteSnapshot,
} from "@/lib/research-engine/build-research-timeline";

export {
  startResearchExecutionTimelineWalk,
  type ResearchExecutionWalkHandle,
} from "@/lib/research-engine/run-research-timeline";

export { runContextResearchEngineClient } from "@/lib/research-engine/run-context-research-client";
