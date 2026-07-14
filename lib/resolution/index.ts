export {
  RESOLUTION_PHASES,
  type ResolutionPhase,
  type ResolutionPhaseStatus,
  type ResolutionBundle,
  type ResolutionPipelineInput,
  type ResolutionIntentReport,
  type ResolutionSemanticReport,
  type ResolutionContextReport,
  type ResolutionResearchItem,
  type ResolutionSimulationStep,
  type ResolutionDecisionReport,
  type ResolutionPlanStep,
  type ResolutionExecutionGate,
} from "@/lib/resolution/types";
export {
  RESOLUTION_PHASE_PROGRESS_KO,
  RESOLUTION_PHASE_DONE_KO,
  RESOLUTION_PHASE_TITLE_KO,
  resolutionProgressKo,
} from "@/lib/resolution/progress-copy";
export {
  runResolutionPipeline,
  projectResolutionBundleAtPhase,
} from "@/lib/resolution/run-resolution-pipeline";
export {
  buildResolutionTimeline,
  type ResolutionTimelineLaneRow,
  type ResolutionTimelineSnapshot,
} from "@/lib/resolution/build-resolution-timeline";
export {
  RESOLUTION_WALK_PIPELINE,
  resolutionPhaseForAgentStage,
  agentStageForResolutionPhase,
} from "@/lib/resolution/map-agent-stage";
