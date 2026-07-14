/**
 * Layer 2 — Blueprint on Runtime (Flow lives here only).
 * @see docs/RIMVIO_CANONICAL_VOCABULARY_V2.md
 */

export {
  composeContextBlueprint,
  readBlueprintBridgeId,
  readBlueprintContainerEventId,
  readBlueprintContextId,
  readBlueprintEmptySlots,
  readBlueprintNextQuestion,
  readBlueprintRequiredResources,
  readBlueprintRuntimeId,
  type ComposeContextBlueprintInput,
  type ContextBlueprint,
  type ContextBlueprintExecutionScope,
  type ContextBlueprintSlotWire,
} from "@/lib/context-blueprint/types";

export {
  CONTEXT_BLUEPRINT_APPROVAL_POLICIES,
  CONTEXT_BLUEPRINT_CONTRACT_VERSION,
  CONTEXT_BLUEPRINT_CREATORS,
  CONTEXT_BLUEPRINT_PRIORITIES,
  CONTEXT_CONTAINER_KINDS,
  CONTEXT_RESOURCE_KINDS,
  DOMAIN_EXECUTOR_IDS,
  type ContextBlueprintApprovalPolicy,
  type ContextBlueprintCreatedBy,
  type ContextBlueprintPriority,
  type ContextContainerKind,
  type ContextResourceKind,
  type DomainExecutorId,
} from "@/lib/context-blueprint/blueprint-constants";

export type {
  ContextBlueprintConstraints,
  ContextBlueprintDestination,
  ContextBlueprintKnownTruth,
  ContextBlueprintNextQuestion,
  ContextBlueprintParticipant,
  ContextBlueprintPeriod,
  PersonalContextRef,
} from "@/lib/context-blueprint/wire-fields";

export {
  assertExecutionSpaceSlotConfirmation,
  composeExecutionSpaceSlot,
  EXECUTION_SPACE_RESOLUTIONS,
  EXECUTION_SPACE_SLOT_ROLES,
  isExecutionSpaceSlotResolved,
  readSelectedExecutionSpaceCandidate,
  type ComposeExecutionSpaceSlotInput,
  type ExecutionSpaceCandidate,
  type ExecutionSpaceResolution,
  type ExecutionSpaceSlot,
  type ExecutionSpaceSlotRole,
} from "@/lib/context-blueprint/execution-space-slots";

export {
  confirmExecutionSpaceDestination,
  confirmJapanTravelDestinationOsaka,
} from "@/lib/context-blueprint/confirm-execution-space-slot";

export {
  composeResourcePlan,
  type ComposeResourcePlanInput,
  type ResourcePlan,
} from "@/lib/context-blueprint/resource-plan";

export {
  composeExecutionSpace,
  composeSpatialPlan,
  hasUnresolvedExecutionSpaceSlots,
  listExecutionAnchors,
  listSpatialAnchors,
  readUnresolvedExecutionSpaceSlots,
  EXECUTION_SPACE_STATUSES,
  SPATIAL_ANCHOR_KINDS,
  type ComposeExecutionSpaceInput,
  type ComposeSpatialPlanInput,
  type ExecutionAnchor,
  type ExecutionSpace,
  type ExecutionSpaceStatus,
  type ExecutionZone,
  type SpatialAnchor,
  type SpatialEdge,
  type SpatialPlan,
  type SpatialPlanStatus,
} from "@/lib/context-blueprint/spatial-plan";

export {
  composeTemporalPlan,
  TEMPORAL_PLAN_STATUSES,
  type ComposeTemporalPlanInput,
  type TemporalPhase,
  type TemporalPlan,
  type TemporalPlanStatus,
} from "@/lib/context-blueprint/temporal-plan";

export {
  readExecutionAnchorById,
  readSpatialAnchorById,
  resolveExecutionSpaceContext,
  resolveSpatialAnchorContext,
  type ExecutionAnchorResolution,
  type SpatialAnchorResolution,
} from "@/lib/context-blueprint/resolve-spatial-plan";

export {
  composeExecutionNodeAction,
  EXECUTION_ACTION_KINDS,
  type ExecutionActionKind,
  type ExecutionNodeAction,
} from "@/lib/context-blueprint/execution-node-action";

export {
  composeSpatialTargets,
  listPhysicalSpatialNodeIds,
  readSpatialTargetForNode,
  type ComposeSpatialTargetsInput,
  type SpatialTargets,
} from "@/lib/context-blueprint/spatial-targets";

export {
  composeTemporalTargets,
  readTemporalTargetForNode,
  type ComposeTemporalTargetsInput,
  type TemporalTarget,
  type TemporalTargets,
} from "@/lib/context-blueprint/temporal-targets";

export {
  composeCapabilityGraph,
  CAPABILITY_KINDS,
  CAPABILITY_NODE_STATUSES,
  readCapabilityByKind,
  readUnresolvedCapabilities,
  type CapabilityEdge,
  type CapabilityGraph,
  type CapabilityKind,
  type CapabilityNode,
  type CapabilityNodeStatus,
  type ComposeCapabilityGraphInput,
} from "@/lib/context-blueprint/capability-graph";

export {
  composeExecutionGraph,
  EXECUTION_NODE_KINDS,
  EXECUTION_NODE_STATUSES,
  readExecutionNodeById,
  readExecutionNodesForExecutor,
  readUnresolvedExecutionNodes,
  type ComposeExecutionGraphInput,
  type ExecutionGraph,
  type ExecutionGraphEdge,
  type ExecutionGraphNode,
  type ExecutionNodeKind,
  type ExecutionNodeStatus,
} from "@/lib/context-blueprint/execution-graph";

export {
  assertNodeResourceAnchor,
  assertTravelRescoutAllowed,
  composeEmptyNodeResourceState,
  isNodeResourceLocked,
  nodeRequiresResourceAnchor,
  planTravelDateDependentRescout,
  NODE_RESOURCE_STATUSES,
  TRAVEL_ONBOARDING_PARALLEL_NODE_IDS,
  type NodeResourceCandidate,
  type NodeResourceState,
  type NodeResourceStatus,
  type TravelOnboardingParallelNodeId,
} from "@/lib/context-blueprint/node-resource-state";

export {
  composeFlow,
  FLOW_NODE_KINDS,
  FLOW_NODE_STATUSES,
  readFlowNodeById,
  readFlowNodesForExecutor,
  readUnresolvedFlowNodes,
  type ComposeFlowInput,
  type Flow,
  type FlowEdge,
  type FlowNode,
  type FlowNodeKind,
  type FlowNodeStatus,
} from "@/lib/context-blueprint/flow";

export {
  composeDigitalSpatialTarget,
  composePhysicalSpatialTarget,
  isPhysicalSpatialTarget,
  SPATIAL_TARGET_MODES,
  type SpatialTarget,
  type SpatialTargetMode,
} from "@/lib/context-blueprint/spatial-target";

export { composeJapanTravelExecutionSpaceHypothesis } from "@/lib/context-blueprint/examples/japan-travel-execution-space-hypothesis";

export {
  composeJapanTravelCapabilityBundle,
  composeJapanTravelCapabilityGraph,
  composeJapanTravelBlueprintWithGraphs,
  composeJapanTravelExecutionGraph,
} from "@/lib/context-blueprint/examples/japan-travel-capability-graph";

export {
  composeMedicalExecutionGraph,
  composeMedicalSpatialTargets,
  composeTradeExecutionGraph,
  composeTradeSpatialTargets,
  composeTradeBlueprint,
  composeTravelTripBlueprint,
  composeTravelTripExecutionGraph,
  composeTravelTripSpatialTargets,
  composeTravelTripTemporalTargets,
} from "@/lib/context-blueprint/examples/travel-trip-execution-graph";

export {
  composeOsakaTravelExecutionSpace,
  composeOsakaTravelSpatialPlan,
} from "@/lib/context-blueprint/examples/osaka-travel-spatial-plan";

export {
  CONTEXT_RUN_STATES,
  CONTEXT_RUN_STATE_OWNER,
  CONTEXT_RUN_TRANSITIONS,
  isValidContextRunTransition,
  resolveContextRunStateOwner,
  type ContextRunState,
} from "@/lib/context-blueprint/context-run-state";
