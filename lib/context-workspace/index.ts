/**
 * Context Workspace SSOT — map-needed work before Commit.
 * NL → Workspace → State Transition → Commit → Globe
 */

export type {
  ActionReadyState,
  ContextSurfaceKind,
  ContextWorkspaceDomain,
  ContextWorkspaceFilter,
  ContextWorkspaceNode,
  ContextWorkspaceNodeKind,
  ContextWorkspaceOpenDetail,
  ContextWorkspaceOpenSource,
  ContextWorkspaceRelationshipEdge,
  ContextWorkspaceState,
  ContextWorkspaceStatus,
  ContextWorkspaceTransitionOp,
  WorkspaceWhyEntry,
} from "@/lib/context-workspace/types";
export {
  ACTION_READY_STATES,
  CONTEXT_WORKSPACE_VERSION,
  domainLabelKo,
} from "@/lib/context-workspace/types";

export {
  CONTEXT_WORKSPACE_CLOSE,
  CONTEXT_WORKSPACE_OPEN,
  CONTEXT_WORKSPACE_UPDATED,
  clearContextWorkspace,
  dispatchContextWorkspaceOpen,
  hasProvisionalContextWorkspace,
  hasProvisionalLodgingWorkspace,
  listDraftContextWorkspaceEventIds,
  readContextWorkspace,
  readContextWorkspaceExpanded,
  subscribeContextWorkspaceOpen,
  subscribeContextWorkspaceUpdated,
  writeContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";

export {
  candidateToWorkspaceNode,
  graphDomainToWorkspaceDomain,
  lodgingCandidateToWorkspaceNode,
  lodgingHitToWorkspaceNode,
  openLodgingContextWorkspace,
  openMapContextWorkspace,
  placeHitToWorkspaceNode,
} from "@/lib/context-workspace/open-map-workspace";

export { lodgingInventoryRowsToPlaceHits } from "@/lib/context-workspace/lodging-inventory-to-place-hits";

export {
  prepareTripWorkspaceDraft,
  shouldPrepareTripWorkspaceDraft,
  OSAKA_TRIP_DRAFT_STOPS,
} from "@/lib/context-workspace/prepare-trip-workspace-draft";
export type { TripDraftStop } from "@/lib/context-workspace/prepare-trip-workspace-draft";

export { resolveWorkspaceFocusNode } from "@/lib/context-workspace/resolve-workspace-focus-node";

export {
  filterNodesForWorkspaceMapFocus,
  isWorkspacePlaceCandidateNode,
  isWorkspaceReadySlotNode,
  resolveExpandableSlotKind,
} from "@/lib/context-workspace/workspace-map-focus";

export { enterWorkspaceSlotFocus } from "@/lib/context-workspace/enter-workspace-slot-focus";
export type { EnterWorkspaceSlotFocusResult } from "@/lib/context-workspace/enter-workspace-slot-focus";

export {
  stampTripDraftOntoContext,
  resolveWorkspaceMapCenter,
  resolveWorkspaceContextDestinationKo,
  resolveWorkspaceMapCenterFromContext,
} from "@/lib/context-workspace/stamp-trip-draft-onto-context";

export {
  applyWorkspaceTransition,
  mergeWorkspaceFilterFromGraphPredicate,
  parseWorkspaceUtteranceTransition,
} from "@/lib/context-workspace/apply-workspace-transition";

export {
  commitContextWorkspaceToGlobe,
  commitLodgingWorkspaceToGlobe,
} from "@/lib/context-workspace/commit-workspace-to-globe";

export { suggestWorkspaceCapsuleTitle } from "@/lib/context-workspace/suggest-workspace-capsule-title";
export { renameContextEventTitle } from "@/lib/context-workspace/rename-context-event-title";

export {
  buildAppleMapsDeepLink,
  buildGoogleMapsDeepLink,
  buildGoogleMapsDirectionsDeepLink,
} from "@/lib/context-workspace/workspace-deep-links";

export {
  tryApplyWorkspaceLodgingTurn,
  tryApplyWorkspaceLodgingTurnSync,
  tryApplyWorkspacePromptTurn,
  tryApplyWorkspacePromptTurnSync,
} from "@/lib/context-workspace/try-apply-workspace-lodging-turn";

export {
  withWorkspaceRelationships,
  buildWorkspaceRelationshipEdges,
} from "@/lib/context-workspace/sync-workspace-relationships";

export {
  forcePinnedVisible,
  listCartWorkspaceNodes,
  listPinnedWorkspaceNodes,
  mergePreservePinnedNodes,
} from "@/lib/context-workspace/merge-preserve-pinned";

export {
  resolveWorkspaceSearchDomain,
  workspaceDomainToToolDomain,
} from "@/lib/context-workspace/resolve-workspace-search-domain";

export {
  appendWorkspaceChatTurn,
  clearWorkspaceChat,
  readWorkspaceChat,
  subscribeWorkspaceChatUpdated,
  type WorkspaceChatObjectCard,
  type WorkspaceChatPatchStrip,
  type WorkspaceChatRole,
  type WorkspaceChatTurn,
} from "@/lib/context-workspace/workspace-chat-store";

export {
  appendWorkspaceSyncedAssistantTurn,
  buildTripDayPlanLines,
  buildWorkspaceObjectCards,
  buildWorkspacePatchStrip,
} from "@/lib/context-workspace/build-workspace-chat-sync";

export {
  buildRealityDraft,
  findRealityDraftDayForNode,
  findRealityDraftNode,
  compileTripEntitySlots,
  materializeTripDraftStops,
  resolveTripDayCount,
  burstFillTripInventory,
  burstFillTripInventoryAsync,
  planTripDayClusters,
  refineTripDraftStops,
  refineTripDraftWeatherSwap,
  estimateWalkMinutes,
  TRIP_DRAFT_MAX_LEG_MINUTES,
  utteranceSuggestsRain,
  guideWebSeedHits,
  type RealityDraft,
  type RealityDraftDay,
  type RealityDraftEntityKind,
  type RealityDraftNodeRef,
  type TripEntitySlot,
  type TripDayPart,
  type TripSlotInventory,
} from "@/lib/context-workspace/reality-draft";

export {
  buildContextBrief,
  buildNodeContextBrief,
  buildBriefReplayNodeIds,
  buildBriefReplayStops,
  dispatchWorkspaceBriefReplay,
  dispatchWorkspaceBriefReplayStep,
  subscribeWorkspaceBriefReplay,
  subscribeWorkspaceBriefReplayStep,
  runWorkspaceBriefReplay,
  WORKSPACE_BRIEF_REPLAY,
  WORKSPACE_BRIEF_REPLAY_STEP,
  type BriefReplayStop,
  type ContextBrief,
  type ContextBriefRole,
  type ContextBriefRoleKind,
  type NodeContextBrief,
  type WorkspaceBriefReplayDetail,
  type WorkspaceBriefReplayStepDetail,
} from "@/lib/context-workspace/context-brief";

export {
  buildCapsuleProjection,
  listCapsuleProjections,
  readCapsuleCompilerIr,
  resumeCapsuleWorkspace,
  type CapsuleProjection,
} from "@/lib/context-workspace/resume-capsule-workspace";

export {
  tryOpenContextAnchorWorkspace,
  readContextAnchorProgressPercent,
  readContextAnchorLastChangeKo,
  type ContextAnchorWorkspaceOpenResult,
} from "@/lib/context-workspace/try-open-context-anchor-workspace";

export {
  projectWorkspaceContextMediaPins,
  isWorkspaceContextMediaPinId,
  WORKSPACE_CONTEXT_MEDIA_PIN_PREFIX,
  type WorkspaceContextMediaPayload,
} from "@/lib/context-workspace/project-workspace-context-media-pins";

export {
  CONTEXT_WORKSPACE_EXPAND,
  dispatchContextWorkspaceExpand,
  subscribeContextWorkspaceExpand,
} from "@/lib/context-workspace/workspace-expand-bridge";

export { isOpenWorkspaceUtterance } from "@/lib/context-workspace/is-open-workspace-utterance";
export { tryOpenWorkspaceFromUtterance } from "@/lib/context-workspace/try-open-workspace-from-utterance";

export { appendWorkspacePreviewComposeTurn } from "@/lib/context-workspace/append-workspace-preview-turn";

export {
  estimateWorkspaceProgressPercent,
  relativeWorkspaceUpdateKo,
} from "@/lib/context-workspace/current-context-metrics";

export { buildWorkspaceCommitPreview } from "@/lib/context-workspace/build-commit-preview";
export type { WorkspaceCommitPreview } from "@/lib/context-workspace/build-commit-preview";
export {
  buildNodePreview,
  buildNodePreviewsForCompare,
} from "@/lib/context-workspace/build-node-preview";
export type {
  NodePreviewModel,
  NodePreviewNearbyChip,
} from "@/lib/context-workspace/build-node-preview";
export { buildWorkspaceWhy } from "@/lib/context-workspace/build-workspace-why";
export { optimizeWorkspaceNodeRoute } from "@/lib/context-workspace/optimize-workspace-route";
export { prepareWorkspaceNodeBooking } from "@/lib/context-workspace/prepare-workspace-booking";
export { approveWorkspacePlaceCheckout } from "@/lib/context-workspace/approve-workspace-place-checkout";
export type { ApproveWorkspacePlaceCheckoutResult } from "@/lib/context-workspace/approve-workspace-place-checkout";
export {
  setWorkspaceNodeActionReadyState,
  resolvePeekPrimaryAction,
  canAdvanceActionReady,
  type PeekPrimaryAction,
} from "@/lib/context-workspace/set-node-action-ready-state";
export {
  resolveWorkspaceNodeCapabilities,
  workspaceNodeCanPrepare,
  prepareCopyFromCapabilities,
  workspaceNodePinKind,
} from "@/lib/context-workspace/resolve-workspace-node-capabilities";
export { buildWorkspaceItineraryLineCoords } from "@/lib/context-workspace/map/build-workspace-itinerary-line";
export { buildWorkspaceConciergeStatus } from "@/lib/context-workspace/build-workspace-concierge-status";
export {
  isWorkspacePlaceAwaitingField,
  readWorkspacePlacePreparedOperation,
  workspacePlacePrepareOperationId,
} from "@/lib/context-workspace/workspace-place-prepare-status";

export {
  resolveWorkspaceMapProvider,
  isAppleMapKitWorkspaceEnabled,
  isMapLibreWorkspaceEnabled,
} from "@/lib/context-workspace/map/workspace-map-provider";
export {
  readAppleMapKitClientConfig,
  readAppleMapKitServerEnv,
} from "@/lib/context-workspace/map/apple-mapkit-config";
export {
  WORKSPACE_OBJECT_LAYERS,
  WORKSPACE_OBJECT_LAYER_LABEL_KO,
  resolveWorkspaceObjectLayer,
  filterNodesByObjectLayer,
  listPresentObjectLayers,
  layerLabelKo,
} from "@/lib/context-workspace/workspace-object-layer";
export type { WorkspaceObjectLayerId } from "@/lib/context-workspace/workspace-object-layer";
