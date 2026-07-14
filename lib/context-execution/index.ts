/**
 * Context Execution — Plan (ordered preview) vs Runtime (step state).
 * @see docs/RIMVIO_EXECUTION_PLAN.md
 */

export {
  CONTEXT_EXECUTION_PLAN_META_KEY,
  applyContextExecutionPlanToMetadata,
  parseContextExecutionPlan,
  readContextExecutionPlanFromEvent,
  readContextExecutionPlanFromMetadata,
} from "@/lib/context-execution/context-execution-plan-metadata";

export { buildContextExecutionPlanFromBlueprint } from "@/lib/context-execution/build-context-execution-plan";

export {
  advanceContextExecutionPlanStep,
  approveContextExecutionPlan,
  completeActiveExecutionPlanStepAndAdvance,
  patchContextExecutionPlanSteps,
  startContextExecutionPlanRuntime,
} from "@/lib/context-execution/advance-plan-step";

export { commitContextExecutionPlanFromApproval } from "@/lib/context-execution/commit-plan-from-approval";

export {
  resolvePlanStepHandoffOffer,
  type PlanStepHandoffChip,
  type PlanStepHandoffOffer,
} from "@/lib/context-execution/build-plan-step-handoff";

export {
  preferFresherExecutionPlan,
} from "@/lib/context-execution/prefer-fresher-execution-plan";

export {
  resolveScheduledEngineIdFromEvent,
  resolveScheduledEngineIdFromExecutionPlan,
} from "@/lib/context-execution/resolve-scheduled-engine-from-plan";

export { offerPlanStepHandoffAfterAdvance } from "@/lib/context-execution/offer-plan-step-handoff-client";

export {
  resolvePlanStepAutoAdvance,
  type PlanStepAutoAdvanceDecision,
} from "@/lib/context-execution/resolve-plan-step-auto-advance";

export {
  recordPlanSequencerProgress,
  readPlanSequencerProgress,
  subscribePlanSequencerProgress,
  type PlanSequencerProgressWire,
  type PlanSequencerProgressPhase,
} from "@/lib/context-execution/record-plan-sequencer-progress";

export {
  blueprintRequiresExecutionPlanApproval,
  gateContextExecutionPlanForUserApproval,
  needsContextExecutionAnyApproval,
  needsContextExecutionPlanApproval,
  needsContextExecutionStepApproval,
  resolveContextExecutionPlanApprovalGate,
} from "@/lib/context-execution/resolve-plan-approval-gate";

export {
  applyEngineTurnToExecutionPlanMetadata,
  resolveExecutionNodeIdForEngineTurn,
} from "@/lib/context-execution/apply-engine-turn-to-plan";
export {
  persistContextExecutionPlanClientAsync,
  type PersistContextExecutionPlanResult,
} from "@/lib/context-execution/persist-context-execution-plan-client";

export { commitContextExecutionPlan } from "@/lib/context-execution/commit-context-execution-plan";

export {
  readContextExecutionPlanFromEventCandidate,
  syncContextExecutionPlanMetadata,
} from "@/lib/context-execution/sync-context-execution-plan-metadata";

export {
  readActiveExecutionGraphNode,
  readActivePlanStep,
  readBlockedNodeIdsFromPlan,
  readPlanStepById,
  readPlanStepByNodeId,
  resolveEffectiveNodeStatus,
} from "@/lib/context-execution/read-active-plan-step";

export {
  buildContextHubPlanPreviewRows,
  formatContextExecutionPlanCurrentStepKo,
  formatContextExecutionPlanPreviewKo,
  EXECUTION_PLAN_STATUS_SYMBOL,
} from "@/lib/context-execution/format-plan-preview-ko";

export type { ContextHubPlanPreviewRow } from "@/lib/context-execution/format-plan-preview-ko";

export {
  ensureTravelExecutionPlan,
  patchTravelExecutionPlanForDestination,
} from "@/lib/context-execution/patch-travel-plan-destination";

export type {
  AdvancePlanStepInput,
  BuildContextExecutionPlanInput,
  ContextExecutionPlanV1,
  ContextOsPhase,
  ExecutionPlanApproval,
  ExecutionPlanStepStatus,
  ExecutionPlanStepV1,
} from "@/lib/context-execution/types";

export { EXECUTION_PLAN_APPROVALS } from "@/lib/context-execution/types";
