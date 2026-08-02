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

export {
  looksLikeGeneralChatEscape,
  parseObjectScopedIntent,
  runObjectScopedPrompt,
  OBJECT_SCOPED_PROMPT_STAGES,
  type ObjectScopedIntent,
  type ObjectScopedPromptResult,
  type ObjectScopedPromptReject,
} from "@/lib/callout/scoped-prompt";

export {
  assertCalloutCannotCommit,
  buildFieldHandoffFromCallout,
  CALLOUT_ALLOWED_MODES,
  FIELD_REALITY_COMMIT_STAGES,
  filterCalloutModes,
  isCalloutAllowedMode,
  listCommitLedgerEntries,
  runFieldRealityCommit,
  type CommitLedgerEntry,
  type FieldRealityCommitResult,
} from "@/lib/callout/commit-boundary";

/** STEP 8 — Dynamic Callout (Control Surface UI Schema) */
export type {
  CalloutUiAction,
  CalloutUiBlock,
  CalloutUiBlockKind,
  DynamicCalloutAgentState,
  DynamicCalloutCompare,
  DynamicCalloutContext,
  DynamicCalloutInput,
  DynamicCalloutIntent,
  DynamicCalloutObject,
  DynamicCalloutSchema,
  DynamicCalloutState,
} from "@/lib/callout/dynamic";
export {
  CALLOUT_UI_BLOCK_KINDS,
  DYNAMIC_CALLOUT_STATES,
  buildDynamicCallout,
  buildDynamicCalloutSchema,
  dynamicObjectFromRimvio,
  formatDynamicCalloutUxKo,
  isDynamicCalloutState,
  resolveDynamicCalloutState,
  schemasForSameObjectAcrossStates,
} from "@/lib/callout/dynamic";

/** Floating Callout Windows — Interaction Layer (UI state only) */
export type {
  CalloutWindow,
  CalloutWindowMode,
  CalloutWindowPosition,
  CalloutWindowSize,
} from "@/lib/callout/windows";
export {
  CALLOUT_WINDOW_COMPACT_SIZE,
  CALLOUT_WINDOW_DEFAULT_SIZE,
  CALLOUT_WINDOW_MAX,
  CALLOUT_WINDOW_MODES,
  CALLOUT_WINDOW_SCALE_MAX,
  CALLOUT_WINDOW_SCALE_MIN,
  clearAllCalloutWindows,
  clearCalloutWindowsForTests,
  closeCalloutWindow,
  findCalloutWindowByEntity,
  focusCalloutWindow,
  getCalloutWindowsSnapshot,
  getFocusedCalloutWindowId,
  listActiveCalloutWindows,
  openCalloutWindow,
  openCalloutWindowsFromAgent,
  readCalloutWindow,
  setCalloutWindowMode,
  subscribeCalloutWindows,
  updateCalloutWindowLayout,
} from "@/lib/callout/windows";
export {
  useCalloutWindowList,
  useCalloutWindows,
  useFocusedCalloutEntityId,
} from "@/lib/callout/windows/use-callout-windows";
