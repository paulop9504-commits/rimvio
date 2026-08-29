export {
  compilePlatformGoal,
  executionModeFromGoal,
  summarizePlatformGoal,
  type PlatformGoal,
  type PlatformGoalKind,
  type PlatformGoalScope,
  type AgentExecutionMode,
} from "@/lib/hub/dev/platform-agent/platform-goal";
export {
  extractStructuredGoal,
  type ExtractedGoal,
  type ExtractedConstraint,
} from "@/lib/hub/dev/platform-agent/goal-extraction";
export {
  selectRelevantContext,
  type RelevantContextSelection,
  type ScoredContextRef,
} from "@/lib/hub/dev/platform-agent/relevant-context";
export {
  decomposePlatformGoal,
  type PlatformTaskGraph,
  type PlatformTask,
} from "@/lib/hub/dev/platform-agent/task-decomposition";
export {
  buildPlatformSourceMap,
  sourcePathsForCapability,
  findRelatedSourceRefs,
  type PlatformSourceRef,
  type PlatformSourceKind,
} from "@/lib/hub/dev/platform-agent/platform-source-map";
export {
  discoverPlatformContext,
  type DiscoveredPlatformContext,
} from "@/lib/hub/dev/platform-agent/context-discovery";
export {
  planPlatformChanges,
  planPlatformCreationE2E,
  type PlatformPlan,
  type PlatformPlanPhase,
} from "@/lib/hub/dev/platform-agent/platform-planner";
export {
  buildCodingPlan,
  buildRepairCodingPlan,
  type CodingPlan,
  type CodingPlanStep,
} from "@/lib/hub/dev/platform-agent/coding-plan";
export {
  RIMVIO_PLATFORM_EXECUTION_LOOP,
  RIMVIO_CAPABILITY_TAXONOMY,
  mapHubLoopPhaseToExecutionPhase,
  type RimvioPlatformExecutionPhase,
  type CapabilityExecutionResult,
} from "@/lib/hub/dev/platform-agent/execution-loop";
export {
  createPlatformGoalState,
  markGoalStepCompleted,
  markGoalStepRunning,
  markGoalStepBlocked,
  applyPartialReplanToGoalState,
  summarizeGoalStateKo,
  type PlatformGoalState,
  type PlatformGoalStateStatus,
} from "@/lib/hub/dev/platform-agent/goal-state";
export {
  createExecutionLedger,
  appendLedgerEntry,
  ledgerCapabilityEntry,
  ledgerVerificationEntry,
  summarizeExecutionLedger,
  type ExecutionLedger,
  type ExecutionLedgerEntry,
} from "@/lib/hub/dev/platform-agent/execution-ledger";
export {
  initPlatformOrchestrator,
  advanceOrchestratorPhase,
  evaluateOrchestratorVerification,
  orchestratorWorkLog,
  type PlatformOrchestratorContext,
  type PlatformOrchestratorDecision,
} from "@/lib/hub/dev/platform-agent/agent-orchestrator";
