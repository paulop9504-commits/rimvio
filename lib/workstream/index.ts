export {
  WORK_BECOMES_CONTEXT_SLOGAN,
  WORKSTREAM_PIPELINE,
  WORKSTREAM_UNTITLED,
  WORKSTREAM_SCRATCH_LABELS,
  REALITY_RESIDUE_LAYERS,
  SELECTION_CANDIDATE_CONFIDENCE,
  isScratchWorkstreamTitle,
  residueLayerForEventKind,
} from "@/lib/workstream/types";
export type {
  WorkstreamEvent,
  WorkstreamEventKind,
  WorkstreamPipelineStage,
  WorkstreamState,
  RealityResidueLayer,
} from "@/lib/workstream/types";
export { isEphemeralWorkUtterance } from "@/lib/workstream/is-ephemeral-work";
export { inferWorkstreamTitle } from "@/lib/workstream/infer-workstream-title";
export {
  ensureWorkstream,
  readWorkstream,
  writeWorkstream,
} from "@/lib/workstream/workstream-store";
export {
  appendWorkstreamEvent,
  recordBudgetUpdated,
  recordFlightCommitted,
  recordHotelCommitted,
  recordHotelSelected,
  recordRestaurantAdded,
  recordScheduleUpdated,
} from "@/lib/workstream/append-workstream-event";
export {
  observationIsNotDecision,
  resolveRealityResidueLayer,
} from "@/lib/workstream/reality-residue-layer";
export {
  TRIP_STAY_SEGMENTS_META_KEY,
  buildTripStayTimeline,
  expandTripPeriodFromSegments,
  mergeTripStaySegment,
  readTripStaySegments,
} from "@/lib/workstream/build-stay-timeline";
export type {
  TripStaySegment,
  TripStayTimelineDay,
  TripStayTimelineDayKind,
} from "@/lib/workstream/build-stay-timeline";
export { computeContextCompleteness } from "@/lib/workstream/compute-context-completeness";
export type {
  ContextCompleteness,
  ContextCompletenessGap,
  ContextCompletenessGapId,
} from "@/lib/workstream/compute-context-completeness";
export { promoteRealityCommitToContextGraph } from "@/lib/workstream/promote-reality-commit";
export {
  filterTripIntakeGapsByConfirmedReality,
  resolveConfirmedRealityAskGate,
  shouldSkipTravelSlotAsk,
} from "@/lib/workstream/resolve-confirmed-reality-ask-gate";
export type {
  ConfirmedRealityAskGate,
  ConfirmedRealityAskSlot,
  ConfirmedRealityKnownFacts,
} from "@/lib/workstream/resolve-confirmed-reality-ask-gate";
export {
  CONTEXT_WORK_SLOT_IDS,
  CONTEXT_WORK_SLOT_LABEL_KO,
} from "@/lib/workstream/context-work-state";
export type {
  ContextWorkNextAction,
  ContextWorkSlotId,
  ContextWorkState,
  ContextWorkStatus,
} from "@/lib/workstream/context-work-state";
export {
  buildContextWorkState,
  formatWorkSlotLabels,
  readContextWorkState,
  readOrBuildContextWorkState,
  syncContextWorkState,
  writeContextWorkState,
} from "@/lib/workstream/sync-context-work-state";
export {
  isContinueWorkUtterance,
  resolveNextWorkAction,
} from "@/lib/workstream/resolve-next-work-action";
export type { NextWorkActionResult } from "@/lib/workstream/resolve-next-work-action";
export {
  AGENT_EXECUTION_STATUS_LABEL_KO,
  buildAgentExecutionState,
  formatTimelineClock,
} from "@/lib/workstream/build-agent-execution-state";
export type {
  AgentExecStep,
  AgentExecStepStatus,
  AgentExecutionState,
  AgentExecutionStatus,
  RealityTimelineEntry,
} from "@/lib/workstream/build-agent-execution-state";
export {
  beginAgentExecutionSession,
  beginAgentHealing,
  buildHealingPlanForScheduleConflict,
  completeAgentExecutionStep,
  finishAgentExecutionSession,
  finishAgentHealing,
  pushAgentExecutionStep,
  readAgentExecutionSession,
  setAgentExecutionCommitStatus,
  setAgentExecutionHeadline,
  setAgentExecutionNextHints,
  subscribeAgentExecutionSession,
} from "@/lib/workstream/agent-execution-session";
export type { AgentExecutionSession } from "@/lib/workstream/agent-execution-session";
export {
  RIMVIO_AGENT_EXECUTION_LOOP,
  RIMVIO_AGENT_IDENTITY,
  RIMVIO_AGENT_LAWS,
  REALITY_EPISTEMIC_LABEL_KO,
  REALITY_EPISTEMIC_LEVELS,
  buildRimvioAgentPromptHeader,
  classifyRealityEpistemic,
} from "@/lib/workstream/rimvio-agent-operating-law";
export type {
  RealityEpistemicLevel,
  RimvioAgentLoopStage,
} from "@/lib/workstream/rimvio-agent-operating-law";
export {
  buildContextTaskGraph,
  formatTaskGraphBrief,
  taskLabelForSlot,
} from "@/lib/workstream/build-context-task-graph";
export type {
  ContextTaskGraph,
  ContextTaskNode,
  ContextTaskNodeStatus,
} from "@/lib/workstream/build-context-task-graph";
export {
  agentLoopStageLabelKo,
  formatAgentStatusBrief,
  nextAgentLoopStage,
  runScheduleConflictSelfHeal,
} from "@/lib/workstream/agent-execution-loop";
export type { AgentLoopCursor } from "@/lib/workstream/agent-execution-loop";
export {
  CURSOR_RIMVIO_PILLAR_MAP,
  RIMVIO_AGENT_SPINE_PILLARS,
  RIMVIO_AGENT_SPINE_SLOGAN,
  formatRimvioAgentSpineBrief,
  readRimvioAgentSpineSnapshot,
} from "@/lib/workstream/rimvio-agent-spine";
export type {
  RimvioAgentSpinePillar,
  RimvioAgentSpineSnapshot,
  RimvioCommitLedgerSummary,
} from "@/lib/workstream/rimvio-agent-spine";
export {
  compileIntentToGoalState,
} from "@/lib/workstream/compile-intent-to-goal-state";
export type { IntentGoalState } from "@/lib/workstream/compile-intent-to-goal-state";
export {
  repairPlanFromVerification,
  verifyScheduleFeasibility,
  verifyUsjLateArrivalDemo,
} from "@/lib/workstream/verification-agent";
export type {
  ScheduleFeasibilityInput,
  VerificationFinding,
  VerificationFindingSeverity,
  VerificationReport,
} from "@/lib/workstream/verification-agent";
export {
  readAgentBrainSnapshot,
  runVerificationThenRepair,
} from "@/lib/workstream/agent-brain";
export type { AgentBrainSnapshot } from "@/lib/workstream/agent-brain";
