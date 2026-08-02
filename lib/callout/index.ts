/**
 * Rimvio Object Callout — Control Surface on Reality Entities.
 */

export type {
  CalloutAction,
  CalloutActionKind,
  CalloutConnectTarget,
  CalloutEvidence,
  CalloutEvidenceLayer,
  CalloutExploreEdge,
  CalloutHandlers,
  CalloutIntentAxis,
  CalloutMode,
  CalloutObjectTypeDescriptor,
  CalloutPrepareStep,
  CalloutSimulationDelta,
  CalloutViewModel,
  Evidence,
  EvidenceGraphRef,
  EvidenceType,
  RimvioObject,
  RimvioObjectLocation,
  RimvioObjectState,
  RimvioObjectType,
} from "@/lib/callout/types";
export {
  CALLOUT_MODES,
  EVIDENCE_TYPES,
  RIMVIO_OBJECT_STATES,
  RIMVIO_OBJECT_TYPES,
} from "@/lib/callout/types";

export {
  CALLOUT_MODE_LABEL_KO,
  getCalloutObjectTypeDescriptor,
  listCalloutObjectTypes,
  OBJECT_STATE_LABEL_KO,
  registerCalloutObjectType,
} from "@/lib/callout/callout-registry";

export {
  buildCalloutViewModel,
  calloutModeLabelKo,
  type CalloutGraphAlternative,
  type CalloutGraphNeighbor,
} from "@/lib/callout/build-callout-model";

export {
  buildObserveEvidence,
  evidenceHighlightLineCoords,
  scoreObserveAiScore,
} from "@/lib/callout/build-observe-evidence";

export {
  resolveRimvioObjectState,
  rimvioObjectFromWorkspaceNode,
  workspaceKindToRimvioObjectType,
} from "@/lib/callout/resolve-rimvio-object";

export { useCalloutState } from "@/lib/callout/hooks/useCalloutState";

export {
  buildCalloutAlternativesFromWorkspace,
  buildCalloutNeighborsFromWorkspace,
  buildRimvioObjectFromWorkspace,
} from "@/lib/callout/from-workspace";

export {
  buildObjectRelationContextFromWorkspace,
  getAllRelationBuckets,
  getRelations,
  OBJECT_RELATION_TYPE_LABEL_KO,
  OBJECT_RELATION_TYPES,
  resolveObjectRelationRole,
  type ObjectRelation,
  type ObjectRelationContext,
  type ObjectRelationRole,
  type ObjectRelationType,
} from "@/lib/callout/object-relation";

export {
  assertSimulationDoesNotCommit,
  buildCurrentRealityFromWorkspace,
  buildSimulationAnchorsFromWorkspace,
  buildSimulationProposalFromNode,
  clearSimulationDraft,
  createSimulationDraft,
  formatMinutesDelta,
  formatWonDelta,
  markSimulationDraftApplied,
  parseWonAmount,
  readSimulationDraft,
  runWhatIfSimulation,
  simulationImpactLinesKo,
  writeSimulationDraft,
  type CurrentRealitySnapshot,
  type SimulationChange,
  type SimulationDraft,
  type SimulationImpact,
  type SimulationProposal,
  type SimulationResult,
} from "@/lib/callout/simulation";

export {
  assertPrepareDoesNotCommit,
  buildPrepareChecklist,
  buildReservationDateRangeFromWorkspace,
  buildReservationPriceFromObject,
  clearReservationDraft,
  createReservationDraft,
  defaultGuestCountFromWorkspace,
  readReservationDraft,
  reservationDraftSummaryKo,
  writeReservationDraft,
  type PrepareChecklistStep,
  type ReservationDraft,
  type ReservationDateRange,
  type ReservationPrice,
} from "@/lib/callout/prepare";

export {
  ensureBuiltinCalloutActions,
  getRegisteredAction,
  invokeRegisteredAction,
  listRegisteredActions,
  registerAction,
  reinstallBuiltinCalloutActionsForTests,
  resetCalloutActionRegistryForTests,
  resolveCalloutActionButtons,
  type CalloutActionButton,
  type CalloutActionContext,
  type CalloutRegistryActionId,
  type RegisterCalloutActionInput,
} from "@/lib/callout/action-registry";
