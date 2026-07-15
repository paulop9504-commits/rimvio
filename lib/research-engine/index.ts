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
export { createContextInventoryCandidateProvider } from "@/lib/research-engine/context-inventory-provider";
export { createLiveExternalCandidateProvider } from "@/lib/research-engine/live-external-provider";
export {
  fetchLiveResearchInventory,
  resolveResearchLiveSurfaces,
  mergeLodgingPlacesWithRates,
  readLiveInventory,
} from "@/lib/research-engine/live-external-ssot";
export {
  resolveResearchSectors,
  runMultiSectorResearchSurgery,
  isMultiSectorResearch,
  formatMultiSectorResultsKo,
  researchSectorLabelKo,
  sectorOfRankedCandidate,
  type ResearchSectorId,
  type ResearchSectorResult,
} from "@/lib/research-engine/multi-sector-surgery";
export {
  buildResearchApprovalGate,
  formatResearchApprovalPromptKo,
  RESEARCH_APPROVAL_APPLY_MIN_CONFIDENCE,
} from "@/lib/research-engine/build-research-approval-gate";
export { applyResearchApprovalChip } from "@/lib/research-engine/apply-research-approval-chip";
export {
  writeResearchApprovalGate,
  readResearchApprovalGate,
  markResearchApprovalGateDecision,
  clearResearchApprovalGate,
} from "@/lib/research-engine/research-approval-store";
export { scoreResearchPersuasion } from "@/lib/research-engine/score-persuasion";
export type {
  PersuasionBreakdown,
  PersuasionContext,
  PersuasionAxisScore,
} from "@/lib/research-engine/score-persuasion";

export {
  detectResearchGaps,
  detectResearchMissingFields,
  pickResearchTool,
  pickResearchToolForMissing,
  toolForMissingField,
  runResearchSurgicalLoop,
  DEFAULT_RESEARCH_TOOLS,
  createBrowserResearchToolRuntime,
  RESEARCH_TOOL_REGISTRY,
  getResearchTool,
  listResearchToolIds,
  matchInventoryHit,
  resolveResearchToolSurface,
  buildResearchEvidenceCards,
  formatResearchEvidenceCardsKo,
  formatCalledGotLine,
  type ResearchTool,
  type ResearchToolCall,
  type ResearchToolId,
  type ResearchToolRuntime,
  type ResearchMissingField,
  type ResearchGapRetryStep,
  type ResearchEvidenceCard,
} from "@/lib/research-engine/tools";

export {
  resolveInitialResearchStrategy,
  resolveNextResearchStrategy,
  shouldSwitchResearchStrategy,
  researchStrategyLabelKo,
  reorderGapsForStrategy,
  reorderRankedForStrategy,
  RESEARCH_STRATEGY_SWITCH_CONFIDENCE,
  RESEARCH_STRATEGY_MAX_SWITCHES,
  type ResearchStrategyId,
  type ResearchStrategyStep,
} from "@/lib/research-engine/research-strategy";

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
