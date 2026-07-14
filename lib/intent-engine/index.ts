export { compileIntentBlueprint } from "@/lib/intent-engine/compile-intent-blueprint";
export { INTENT_LIBRARY, getIntentLibraryEntry } from "@/lib/intent-engine/intent-library";
export { parseIntents } from "@/lib/intent-engine/parse-intents";
export { expandIntentSemantics } from "@/lib/intent-engine/semantic-expand";
export { composeIntents, mergeProfiles } from "@/lib/intent-engine/compose-intents";
export { resolveIntentConflicts } from "@/lib/intent-engine/resolve-conflicts";
export {
  projectIntentBlueprintToTravel,
  type TravelIntentProjection,
} from "@/lib/intent-engine/project-to-travel-brain";
export {
  INTENT_ENGINE_VERSION,
  type IntentBlueprint,
  type IntentCategory,
  type IntentMood,
  type IntentStyleToken,
  type SemanticProfile,
  type EnrichedIntent,
  type IntentLibraryEntry,
} from "@/lib/intent-engine/types";
export {
  AGENT_STAGES,
  EXECUTION_LANES,
  TRIP_REVISE_STAGE_PIPELINE,
  AUTO_ADVANCE_UNTIL_STAGE,
  laneForStage,
  nextStageInPipeline,
  stageIndex,
  type AgentStage,
  type ExecutionLaneId,
  type ExecutionLaneStatus,
  type IntentExecutionProfile,
} from "@/lib/intent-engine/agent-stage";
export {
  AGENT_STAGE_PROGRESS_KO,
  EXECUTION_LANE_TITLE_KO,
  stageProgressKo,
} from "@/lib/intent-engine/agent-stage-copy";
export {
  buildIntentExecutionTimeline,
  type IntentExecutionTimelineSnapshot,
  type ExecutionTimelineLaneRow,
} from "@/lib/intent-engine/build-intent-execution-timeline";
export { isTripReviseUtterance } from "@/lib/intent-engine/is-trip-revise-utterance";
export {
  startIntentExecutionTimelineWalk,
  completeIntentExecutionTimeline,
} from "@/lib/intent-engine/run-intent-execution-timeline";
