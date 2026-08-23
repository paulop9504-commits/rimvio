"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { RimvioGlobeHubClient } from "@/components/experience/rimvio-globe-hub-client";
import { GlobeContextHubDetailSheet } from "@/components/globe/globe-context-hub-detail-sheet";
import { GlobeHomeLeftChrome } from "@/components/globe/globe-home-left-chrome";
import { GlobeRealityCommitPulseBadge } from "@/components/globe/globe-reality-commit-pulse-badge";
import { GlobeContextMapVideoStage } from "@/components/globe/globe-context-map-video-stage";
import { GlobeContextBrainMapOverlay } from "@/components/globe/globe-context-brain-map-overlay";
import { GlobeContextBrainNodeCard } from "@/components/globe/globe-context-brain-node-card";
import { GlobeBrainSurfaceOntologyPeek } from "@/components/globe/globe-brain-surface-ontology-peek";
import { GlobePlaceActionGraphStage } from "@/components/globe/globe-place-action-graph-stage";
import { GlobeActionPlanCard } from "@/components/globe/globe-action-plan-card";
import { GlobeOsakaDemoStage } from "@/components/globe/globe-osaka-demo-stage";
import { GlobeOsakaDemoPrepCard } from "@/components/globe/globe-osaka-demo-prep-card";
import {
  runOsaka30sDemo,
  approveOsaka30sDemo,
  cancelOsaka30sDemo,
  rewindOsaka30sDemo,
  continueOsaka30sDemo,
  subscribeOsaka30sDemo,
  readOsakaDemoTheaterState,
  resetOsakaDemoTheaterState,
  subscribeOsakaDemoTheater,
  type Osaka30sDemoProgress,
} from "@/lib/globe/osaka-demo";
import { useOsakaDemoMarkerReveal } from "@/hooks/use-osaka-demo-marker-reveal";
import {
  consumeActionPlanFieldOpenRequest,
  subscribeActionPlanUi,
} from "@/lib/action-planner";
import {
  projectSessionGraphCompareArcs,
  projectSessionGraphToBrainCandidates,
  readSessionGraph,
  subscribeSessionGraph,
  fieldScoutOwnsLodgingGraphMarkers,
} from "@/lib/graph-command";
import { readContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import { GlobeBrainSurfaceVideoChip } from "@/components/globe/globe-brain-surface-video-chip";
import { GlobeBrainSurfaceFloatingFrame } from "@/components/globe/globe-brain-surface-floating-frame";
import { GlobeSpatialTraceTourChip } from "@/components/globe/globe-spatial-trace-tour-chip";
import { GlobeContextConditionPromptFrame } from "@/components/globe/globe-context-condition-prompt-frame";
import { GlobeContextAgentConnector } from "@/components/globe/globe-context-agent-connector";
import { GlobeResourceReelStage } from "@/components/globe/globe-resource-reel-stage";
import { GlobeIntelligentDiscoveryStage } from "@/components/globe/globe-intelligent-discovery-stage";
import { GlobePlaceMapYoutubeStage } from "@/components/globe/globe-place-map-youtube-stage";
import { ContextWorkspaceShell } from "@/components/context-workspace/context-workspace-shell";
import {
  resumeCapsuleWorkspace,
  tryOpenContextAnchorWorkspace,
} from "@/lib/context-workspace";
import {
  CONTEXT_WORKSPACE_CLOSE,
  readContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import { subscribeContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import { WorkspaceSdkHost } from "@/components/workspace-sdk/workspace-sdk-host";
import { useIntelligentDiscoveryFeedFocus } from "@/lib/globe/intelligent-pin/use-intelligent-discovery-feed-focus";
import { globeFamiliesHiddenByWorkspace } from "@/lib/context-workspace/should-project-lodging-to-globe";
import { dispatchGlobeResourceReelFocus } from "@/lib/globe/resource-reel";
import { subscribeGlobePlaceOntologyFocus } from "@/lib/globe/place-ontology/globe-place-ontology-focus-bridge";
import {
  appendProjectedCandidateId,
  clearPlaceExploreSession,
  entityFromBrainCandidate,
  openPlaceActionGraphWithPipeline,
  projectExploreChildToBrain,
  readPlaceExploreSession,
  resolvePlaceExploreBias,
  runPlaceExploreActionPipeline,
  shouldOpenPlaceActionGraph,
  subscribePlaceExploreSession,
  syncPlaceExploreProjectionPipeline,
  type PlaceExploreGraphNode,
} from "@/lib/globe/entity-explore";
import { MAP_FOCUS_PIN_VIEWPORT_Y } from "@/lib/globe/map-anchored-overlay-layout";
import { useGlobeLodgingDiscoverySession } from "@/hooks/use-globe-lodging-discovery-session";
import { useGlobeEateryDiscoverySession } from "@/hooks/use-globe-eatery-discovery-session";
import { useBrainSurfaceProjectionReveal } from "@/hooks/use-brain-surface-projection-reveal";
import { extractYouTubeVideoId } from "@/lib/enrichers/youtube-url";
import { useMediaSpatialTraceTour } from "@/hooks/use-media-spatial-trace-tour";
import { useGlobeBriefReplay } from "@/hooks/use-globe-brief-replay";
import { useContextMediaGuides } from "@/hooks/use-context-media-guides";
import { useGlobeContextBrainActions } from "@/hooks/use-globe-context-brain-actions";
import { useWorkQueue } from "@/hooks/use-work-queue";
import { usePriorityStrip } from "@/hooks/use-priority-strip";
import { useRealitySurfaceProjection } from "@/hooks/use-reality-surface-projection";
import { blueprintNeedsDestination, projectBridgeMapArcs } from "@/lib/reality-surface";
import { tryEnterDomainRuntimeAfterIngress } from "@/lib/globe-ingress/try-enter-domain-runtime-after-ingress-client";
import { resolveTripContextAnchor } from "@/lib/experience-run/resolve-trip-context-anchor";
import {
  CONTEXT_ANCHOR_NEAR_KM,
  resolveStableContextPlaceAnchor,
} from "@/lib/context-instance/build-context-instance";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import { resolveVideoMapAnchor } from "@/lib/globe/resolve-video-map-anchor";
import {
  canCommitBridgePlanningTruth,
  canProposeBridgePlanningTruth,
  commitBridgePlanningTruth,
  composeRealitySurfaceFromBridgeTruth,
  proposeBridgePlanningTruth,
  readBridgePlanningProposalForUser,
  readBridgePlanningTruth,
  seedBridgePlanningTruthFromIngress,
} from "@/lib/bridge-planning";
import type { OperatorChoiceChip } from "@/components/globe/globe-operator-choice-chips";
import { composeTripFlowChatAssistantLine } from "@/lib/globe/trip-situation-router/build-trip-flow-chat-lines";
import {
  resolveTripSituationRouter,
  type TripSituationRouterChip,
} from "@/lib/globe/trip-situation-router";
import { getDepartureHubAirport } from "@/lib/globe/departure-hub-airports";
import type { RealitySurfaceSession } from "@/lib/reality-surface";
import { GlobeChatScreen } from "@/components/globe/chat/globe-chat-screen";
import { PersonalGlobeSheet } from "@/components/globe/personal-globe-sheet";
import { GlobeCaptureDock } from "@/components/globe/globe-capture-dock";
import { GlobePriorityStrip } from "@/components/globe/globe-priority-strip";
import { GlobeRealitySurfaceStrip } from "@/components/globe/globe-reality-surface-strip";
import { GlobeTicketQrViewer } from "@/components/globe/globe-ticket-qr-viewer";
import { GlobeWorkQueueSheet } from "@/components/globe/globe-work-queue-sheet";
import type { PriorityStripPayload } from "@/lib/globe/priority-strip";
import { GlobeHomeMemoryRecallPanel,
  GlobeHomeMemoryRecallProvider,
  GlobeHomeRecallOneLiner,
} from "@/components/globe/globe-home-memory-dock";
import { GlobeMorningPrepOverlay } from "@/components/globe/globe-morning-prep-card";
import { GlobeEventHorizonPushOverlay } from "@/components/globe/globe-event-horizon-push-card";
import { GlobeFactProjectionOverlay } from "@/components/globe/globe-fact-projection-card";
import { GlobePortalIntentPeekPanel } from "@/components/globe/globe-portal-intent-peek";
import { GlobePhotoIngestUndoBar } from "@/components/globe/globe-photo-ingest-undo-bar";
import { GlobeTrendBridgeLayer } from "@/components/globe/globe-trend-bridge-layer";
import type { GlobeContextIngestBarHandle } from "@/components/globe/globe-context-ingest-bar";
import { GlobeFirstVisitCoach } from "@/components/globe/globe-first-visit-coach";
import { GlobeContextListSheet } from "@/components/globe/globe-context-list-sheet";
import { GlobeContextManageSheet } from "@/components/globe/globe-context-manage-sheet";
import { GlobeContextStackPicker } from "@/components/globe/globe-context-stack-picker";
import { GlobeCreateContextSheet } from "@/components/globe/globe-create-context-sheet";
import { GlobeContextShareSheet } from "@/components/globe/globe-context-share-sheet";
import { GlobeInboxSheet } from "@/components/globe/globe-inbox-sheet";
import {
  GlobeMediaPoolSheet,
} from "@/components/globe/globe-media-pool-sheet";
import { ExperienceBridgeGhostSheet } from "@/components/globe/experience-bridge-ghost-sheet";
import { GlobeSettingsSheet } from "@/components/globe/globe-settings-sheet";
import { GlobeLodgingCheckoutHost } from "@/components/globe/globe-lodging-checkout-host";
import { MyProfileSheet } from "@/components/peer-chat/my-profile-sheet";
import { PinOpenSheet } from "@/components/globe/pin-open-sheet";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { subscribeGlobeMapMediaFocus } from "@/lib/globe/globe-map-media-focus-bridge";
import { subscribeGlobePhotoIngest } from "@/lib/globe/globe-photo-ingest-bridge";
import { isGlobeComposeInputFocused } from "@/lib/globe/compose-input-focus";
import { setLiveLocationPowerMode } from "@/lib/location-ping/live-location-service";
import { usePersonalGlobePinSync } from "@/hooks/use-personal-globe-pin-sync";
import { findPersonalGlobePinByEventId, PERSONAL_GLOBE_PINS_UPDATED } from "@/lib/globe/personal-globe-pin-store";
import { useGlobeLayerMode } from "@/hooks/use-globe-layer-mode";
import { subscribeFieldFlyToIntent, subscribeFieldSheetOpenState, dispatchCloseFieldSheet } from "@/lib/nav/field-sheet-bridge";
import {
  clearFieldDashboardSearchParams,
  openFieldDashboardIngress,
  openFieldMineIngress,
  parseFieldDashboardIngressFromSearchParams,
} from "@/lib/nav/field-dashboard-ingress";
import { finishContextRun } from "@/lib/context-run/execution-feed-lifecycle";
import { readActiveRunState } from "@/lib/context-run/run-state-store";
import { syncMarketQuickListDoneToFeed } from "@/lib/context-run/sync-market-compose-to-feed";
import { buildComposerGraphId } from "@/lib/context-run/resolve-globe-composer-surface";
import {
  markComposeDraftSubmitted,
  syncResourceCompleteToChat,
} from "@/lib/globe/chat/sync-resource-complete-to-chat";
import { resumeComposeDetailSlotFill } from "@/lib/portal/resume-compose-detail-slot-fill";
import {
  readPortalComposeRunState,
  writePortalComposeRunState,
} from "@/lib/portal/portal-compose-run-store";
import { completeWorkQueueItem } from "@/lib/work-queue";
import type { WorkQueueItem } from "@/lib/work-queue";
import {
  syncPortalComposeClarifyToFeed,
} from "@/lib/context-run/sync-portal-compose-to-feed";
import { syncPortalComposeTurnToChat, syncPortalComposeClarifyToChat } from "@/lib/globe/chat/sync-portal-compose-to-chat";
import { useGlobeInbox } from "@/hooks/use-globe-inbox";
import { useMediaPool } from "@/hooks/use-media-pool";
import { useGlobeTripArrival } from "@/hooks/use-globe-trip-arrival";
import { useTrendBridge } from "@/hooks/use-trend-bridge";
import { useTrendBridgeRollup } from "@/hooks/use-trend-bridge-rollup";
import { useGlobeContextPlaceAlignment } from "@/hooks/use-globe-context-place-alignment";
import { useBridgeMediaSync } from "@/hooks/use-bridge-media-sync";
import { useBridgePlanningSyncFeedback } from "@/hooks/use-bridge-planning-sync-feedback";
import { useAuth } from "@/hooks/use-auth";
import { isBridgeLinkedEventId } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { focusGlobeContextOnMap } from "@/lib/globe/focus-globe-context-on-map";
import {
  isGlobeContextSwitchBlocked,
  shouldAutoLaunchBrainSurface,
  shouldOpenGlobeBridgeSheet,
  shouldOpenGlobeHubDetail,
} from "@/lib/globe/globe-focus-surface-policy";
import {
  canOfferGlobeLocationPrompt,
  markGlobeLocationPromptOffered,
} from "@/lib/globe/globe-location-prompt-budget";
import { runSilentPassiveLocationResolves } from "@/lib/globe/passive-context/run-silent-passive-location-resolves";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { materializeGlobeContextAnchorEventFromCluster } from "@/lib/globe/materialize-globe-context-anchor-event";
import { commitBrainSurfaceMemoPin } from "@/lib/globe/commit-brain-surface-memo-pin";
import { attachPoolMediaBatch } from "@/lib/media-pool/attach-pool-media-to-event";
import {
  revertGlobeContextPinToCardPlace,
  resolveGlobeContextCardPinCluster,
} from "@/lib/globe/globe-context-card-coords";
import {
  closeGlobeContextConditionPanel,
  isGlobeContextConditionPanelOpen,
  openGlobeContextConditionPanel,
  publishGlobeTouchedContext,
  subscribeGlobeContextConditionPanel,
} from "@/lib/globe/context-condition-ai/globe-context-condition-panel-bridge";
import { clearContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import { isLodgingInventoryMisanchored } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import {
  readContextConditionDiscoveryOverlay,
  subscribeContextConditionDiscoveryOverlay,
} from "@/lib/globe/context-condition-ai/context-condition-discovery-overlay-bridge";
import type { ContextConditionDiscoveryOverlay } from "@/lib/globe/context-condition-ai/context-condition-discovery-overlay-types";
import {
  handleDiscoveryLensGlobePress,
  readDiscoveryLensSession,
  subscribeDiscoveryLensSession,
  type DiscoveryLensSession,
} from "@/lib/globe/discovery-lens";
import {
  armGlobeContextAgent,
  bindGlobeContextAgent,
  cancelGlobeContextAgentArm,
  clearGlobeContextAgent,
  readGlobeContextAgentSession,
  resetContextAgentRuntime,
  subscribeGlobeContextAgent,
  type GlobeContextAgentDetail,
} from "@/lib/globe/context-agent";
import { snapGlobeToContextAgentAnchor } from "@/lib/globe/context-agent/snap-globe-to-context-agent-anchor";
import type { GlobeContextTimeFilter } from "@/lib/globe/globe-context-time-filter";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";
import {
  globeContextTapHitRadiusMeters,
  resolveGlobeContextsNearTap,
} from "@/lib/globe/resolve-globe-contexts-near-tap";
import type { GlobeContextTimelineEntry } from "@/lib/globe/list-globe-context-timeline";
import type { GlobeManageContextEntry } from "@/lib/globe/list-globe-manage-contexts";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { listConnectableGlobeContextPinClusters } from "@/lib/globe/list-connectable-globe-context-pin-clusters";
import { resolveGlobeContextPinCluster } from "@/lib/globe/resolve-globe-context-pin-cluster";
import { listGlobeContextPeerOptions } from "@/lib/globe/list-globe-context-peer-options";
import type { GlobeContextPeopleFilter } from "@/lib/globe/globe-context-people-filter";
import {
  GLOBE_CONTEXT_SHARE_REQUEST,
  type GlobeContextShareRequestDetail,
} from "@/lib/globe/globe-context-share-request";
import {
  globeContextShouldMapReplayFirst,
  resolveExperienceVolumeForEvent,
} from "@/lib/globe/resolve-globe-context-primary-video";
import { listGlobeContextNavigationOrder } from "@/lib/globe/list-globe-context-navigation-order";
import { projectContextMediaReel } from "@/lib/globe/project-context-media-reel";
import {
  resolvePinOpenInitialPage,
  type PinOpenInitialPage,
} from "@/lib/globe/resolve-pin-open-initial-page";
import {
  contextMapTapPhaseAllowsMediaReplay,
  resolveInitialContextMapTapPhase,
  type ContextMapTapPhase,
} from "@/lib/globe/context-map-tap-phase";
import {
  resolveGlobeThreeFloorsStage,
  resolveRimvioUxSurfaceMode,
  shouldSuppressGlobePriorityChrome,
} from "@/lib/globe/resolve-globe-three-floors-stage";
import { resolveBrainSurfaceClosureLine } from "@/lib/globe/resolve-brain-surface-closure-line";
import { GlobeThreeFloorsStrip } from "@/components/globe/globe-three-floors-strip";
import type { PinMediaContextPage } from "@/components/globe/pin-open-media-context-pager";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import {
  hydrateMediaContextStore,
  MEDIA_SPACETIME_UPDATED,
} from "@/lib/location-ping/media-context-store";
import { GLOBE_CONTEXT_MEDIA_ACCEPT } from "@/lib/feed/ingest-globe-context-media";
import type { GlobeMediaIngestProgressEvent } from "@/lib/feed/ingest-globe-context-media";
import { prepareGlobePhotoIngestDraft } from "@/lib/globe/prepare-globe-photo-ingest-draft";
import {
  buildPhotoIngestFileItems,
  markPhotoIngestFileCommitting,
  markPhotoIngestFileDone,
  markPhotoIngestFileError,
  patchPhotoIngestFileItem,
  revokePhotoIngestPreviewUrls,
  type PhotoIngestFileItem,
} from "@/lib/globe/photo-ingest-file-progress";
import { retryGlobePhotoIngestFile } from "@/lib/globe/retry-globe-photo-ingest-file";
import { validateIngestMediaFiles } from "@/lib/globe/validate-ingest-media-files";
import {
  subscribeCaptureSheetOpen,
} from "@/lib/nav/open-capture-sheet-bridge";
import { resolveContextTriggerOpenOptions } from "@/lib/globe/context-triggers/resolve-context-trigger-open-options";
import type { GlobeContextTrigger } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import {
  stashPhotoIngestUndo,
  undoGlobePhotoIngest,
  type GlobePhotoIngestUndoPayload,
} from "@/lib/globe/globe-photo-ingest-undo";
import {
  writeGlobeResumeSession,
  type GlobeResumeSession,
} from "@/lib/globe/globe-resume-session";
import type { GlobePhotoIngestDraft } from "@/lib/globe/prepare-globe-photo-ingest-draft";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
import { expandMediaGuideOnMap, pickPrimaryExpandableMediaGuide } from "@/lib/globe/expand-media-guide-on-map";
import { queryMediaGuideByGuideNodeId } from "@/lib/ontology/media-guide-store";
import { readPinnedLodgingResourceId } from "@/lib/globe/context-hub/pin-lodging-selection-to-context";
import { readPinnedEateryResourceId } from "@/lib/globe/eatery/pin-eatery-selection-to-context";
import {
  commitKnowledgeToProjection,
  patchMediaGuidesToProjection,
} from "@/lib/situation-projection/compose-brain-projection";
import { buildProjectionNodeExplanation } from "@/lib/situation-projection/projection-node-explanation";
import { resolveProjectionNodePresentation } from "@/lib/situation-projection/projection-node-presentation";
import {
  readProjectionManifestForAnchor,
  subscribeProjectionStore,
} from "@/lib/situation-projection/projection-store";
import { resolveProjectionNodeTap } from "@/lib/situation-projection/resolve-projection-node-tap";
import {
  projectBrainSurfaceBatch,
} from "@/lib/situation-projection/project-brain-surface-batch";
import { ensureTravelBrainMicroInventory } from "@/lib/situation-projection/ensure-travel-brain-micro-inventory";
import { refreshContextMediaGuidesForEvent } from "@/lib/globe/media/refresh-context-media-guides";
import type {
  BrainSurfaceCandidateFamily,
  BrainSurfaceProjectionBatch,
  BrainSurfaceProjectionCandidate,
} from "@/lib/situation-projection/brain-surface-types";
import { prioritizeBrainSurfaceCandidatesForFocus } from "@/lib/situation-projection/brain-surface-focus";
import { resolveBrainSurfaceMapMarkers } from "@/lib/globe/resolve-brain-surface-map-markers";
import {
  filterBrainSurfaceCandidatesForDisclosure,
  resolveRelatedBrainSurfaceCandidates,
} from "@/lib/globe/brain-surface-progressive-disclosure";
import { filterVisibleBrainSurfaceCandidates } from "@/lib/globe/brain-surface-marker-media";
import { filterBrainSurfaceShadowExpandPins } from "@/lib/globe/brain-surface-shadow-expand";
import { buildBrainSurfaceSpatialTraceArcs } from "@/lib/globe/brain-surface-spatial-trace";
import type { GlobeTripArc } from "@/lib/globe/project-trip-leg-arcs";
import { BRAIN_SURFACE_DOCK_PIN_VIEWPORT_Y } from "@/lib/globe/brain-surface-dock-layout";
import { computeLodgingDiscoveryBounds } from "@/lib/globe/lodging/compute-lodging-discovery-bounds";
import {
  buildMediaSpatialTraceTourStopsFromGuide,
} from "@/lib/situation-projection/build-media-spatial-trace-tour";
import { resolveRimvioHonorific } from "@/lib/copy/rimvio-honorific";
import { getTrendBridgeFeature } from "@/lib/globe/trend-bridge/trend-bridge-feature-registry";
import { findMarketIntentByEventId } from "@/lib/globe/market/market-alignment-store";
import { MarketAlignmentSummary } from "@/components/market/market-alignment-summary";
import { GlobeMarketIntentWizardSheet } from "@/components/globe/globe-market-intent-wizard-sheet";
import {
  listActiveMarketIntents,
  subscribeMarketIntents,
} from "@/lib/globe/market/market-alignment-store";
import { commitTextContextIngress } from "@/lib/context-run/commit-text-context";
import { dispatchContextRun } from "@/lib/context-run/dispatch-context-run";
import { ensureGlobeChatGraphId } from "@/lib/globe/chat/ensure-globe-chat-graph-id";
import { commitMarketIntentQuickList } from "@/lib/globe/market/commit-market-intent-quick-list";
import { buildMarketQuickListDraft } from "@/lib/globe/market/build-market-quick-list-draft";
import {
  resolveComposeSessionGraphId,
  resolvePendingMarketComposeAction,
} from "@/lib/portal/resolve-pending-market-compose";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import type { MarketWizardStepId } from "@/lib/globe/market/market-intent-wizard-flow";
import { submitTrendBridgeContributionFromEvent } from "@/lib/globe/trend-bridge/client/submit-trend-bridge-contribution";
import { subscribeGlobeContextHubOpen } from "@/lib/globe/context-hub/globe-context-hub-open-bridge";
import { subscribeGlobeAskBridgeFocus } from "@/lib/globe/globe-ask-bridge-focus";
import {
  subscribeRealityCommitPulse,
} from "@/lib/reality-queue";
import {
  subscribeGlobeBrainContextRunRequest,
} from "@/lib/globe/brain/globe-brain-context-run-bridge";
import {
  subscribeGlobeBrainProjectionRequest,
} from "@/lib/globe/brain/globe-brain-projection-bridge";
import { RimvioPortalSheet } from "@/components/portal/rimvio-portal-sheet";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { PortalOpenSource } from "@/lib/portal/portal-types";
import type { PortalIntentId } from "@/lib/portal/portal-types";
import { subscribeGlobePortalOpen } from "@/lib/portal/globe-portal-open-bridge";
import {
  peekGlobeComposeSeedText,
  subscribeGlobeComposeSeed,
} from "@/lib/globe/globe-compose-seed-bridge";
import { finalizeLodgingHubCheckoutFromPgReturn, finalizeLodgingHubCheckoutFromLiteApiReturn } from "@/lib/globe/hub-checkout";
import {
  clearHubPgPendingFinalize,
  readHubPgPendingFinalize,
} from "@/lib/globe/hub-checkout/pg/hub-pg-pending-session";
import {
  clearLiteApiPendingCheckout,
  readLiteApiPendingCheckout,
} from "@/lib/globe/hub-checkout/liteapi/liteapi-pending-checkout";
import { buildLiteApiGuestPayload } from "@/lib/globe/context-hub/providers/liteapi/build-liteapi-guest-payload";
import { readIdentityVaultBundleClient } from "@/lib/identity-vault/read-identity-vault-bundle-client";
import { subscribeIdentityVaultSettingsOpen } from "@/lib/identity-vault/open-identity-vault-settings-bridge";
import { subscribeOpenPaymentVaultSettings } from "@/lib/payment-vault/open-payment-vault-settings-bridge";
import { subscribeGlobeMarketProjectionLaunch } from "@/lib/portal/globe-market-projection-bridge";
import {
  subscribeGlobeMarketQuickListRequest,
  dispatchGlobeMarketQuickListResult,
} from "@/lib/portal/globe-market-quick-list-bridge";
import { isExternalPinCluster } from "@/lib/globe/merge-globe-pin-clusters";
import {
  enterContextSoloStage,
  exitContextSoloStage,
} from "@/lib/globe/spatial-semantic/enter-context-solo-stage";
import { projectBridgeGhostClusters } from "@/lib/experience-bridge/project-bridge-ghost-clusters";
import type { PendingBridgeInvite } from "@/hooks/use-pending-bridge-invites";
import { useSharedWorkspaceRealtimeSync } from "@/hooks/use-shared-workspace-realtime-sync";
import type { GlobeKnowledgePlacementPending } from "@/lib/globe/globe-knowledge-placement-pending";
import { readGlobeKnowledgePlacementPending } from "@/lib/globe/globe-knowledge-placement-pending";
import { runGlobeEateryDiscovery } from "@/lib/globe/eatery/run-globe-eatery-discovery";
import { subscribeLodgingDiscoveryResourceOperations } from "@/lib/resource-operation";
import { runGlobeLodgingDiscovery } from "@/lib/globe/lodging/run-globe-lodging-discovery";

const PIN_REVERT_MS = 1_100;
/** Pin tap and globe click fire together — ignore the follow-up globe press. */
const GLOBE_PIN_PRESS_SUPPRESS_MS = 120;

function GlobeHomeBody() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  useSharedWorkspaceRealtimeSync(true);
  const rimvioHonorific = resolveRimvioHonorific(user);
  const recallEventId = searchParams.get("recallEvent");
  /** Blocks deep-link re-open after the user closes the PromptFrame with X. */
  const dismissedAssistantRecallRef = useRef<string | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<RimvioGlobeHubHandle>(null);
  const ingestBarRef = useRef<GlobeContextIngestBarHandle>(null);
  const memoryRecallComposeRef = useRef<{
    onFocus: () => void;
    onBlur: () => void;
  } | null>(null);
  // localStorage-backed event store must not paint on SSR (#418).
  const [eventsHydrated, setEventsHydrated] = useState(false);
  useEffect(() => {
    setEventsHydrated(true);
  }, []);
  const [globeMemoryDismissToken, setGlobeMemoryDismissToken] = useState(0);
  const [portalPeekOpen, setPortalPeekOpen] = useState(false);
  const [globeGuideOpen, setGlobeGuideOpen] = useState(false);
  const [marketIntentDraft, setMarketIntentDraft] = useState<MarketIntentDraft | null>(
    null,
  );
  const [marketConfirmOpen, setMarketConfirmOpen] = useState(false);
  const [marketWizardStartStep, setMarketWizardStartStep] =
    useState<MarketWizardStepId | undefined>(undefined);
  const [marketPortalLaunch, setMarketPortalLaunch] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [globeChatOpen, setGlobeChatOpen] = useState(false);
  const [realityCommitPulseEventId, setRealityCommitPulseEventId] = useState<
    string | null
  >(null);
  const [workQueueOpen, setWorkQueueOpen] = useState(false);
  const { items: workQueueItems, refresh: refreshWorkQueue } = useWorkQueue();
  const [priorityQrOpen, setPriorityQrOpen] = useState(false);
  const [priorityQrSrc, setPriorityQrSrc] = useState<string | null>(null);
  const [priorityQrTitle, setPriorityQrTitle] = useState<string | null>(null);
  const [personalGlobeOpen, setPersonalGlobeOpen] = useState(false);
  const [portalEvent, setPortalEvent] = useState<EventCandidate | null>(null);
  const [portalComposeText, setPortalComposeText] = useState<string | undefined>();
  const [portalSource, setPortalSource] = useState<PortalOpenSource>("composer");
  const [portalInitialIntentId, setPortalInitialIntentId] = useState<PortalIntentId | null>(
    null,
  );
  const [marketTradeBusy, setMarketTradeBusy] = useState(false);
  const [marketFocusEventId, setMarketFocusEventId] = useState<string | null>(null);
  const [marketMounted, setMarketMounted] = useState(false);
  const [marketIntentRevision, setMarketIntentRevision] = useState(0);
  const pendingMarketComposeRef = useRef<{
    kind: "wizard" | "quick_list";
    draft?: MarketIntentDraft;
    eventId: string;
    composeText: string;
  } | null>(null);
  const liveLocation = useLiveLocationSnapshot();
  useEffect(() => {
    setMarketMounted(true);
  }, []);
  useEffect(
    () => subscribeMarketIntents(() => setMarketIntentRevision((value) => value + 1)),
    [],
  );
  const marketManageCount = useMemo(() => {
    void marketIntentRevision;
    if (!marketMounted) {
      return 0;
    }
    return listActiveMarketIntents().length;
  }, [marketIntentRevision, marketMounted]);
  const {
    settings: trendBridgeSettings,
    setEnabled: setTrendBridgeEnabled,
    setActiveBridgeId: setTrendBridgeActiveId,
    setPulseIntent: setTrendBridgePulseIntent,
    layerActive: trendBridgeLayerActive,
  } = useTrendBridge();
  usePersonalGlobePinSync(true);
  const { layerMode, setLayerMode } = useGlobeLayerMode();
  const {
    notifications: globeNotifications,
    bridgeInvites: pendingBridgeInvites,
    totalCount: globeInboxCount,
    refreshBridgeInvites,
    dismissBridgeInvite: dismissInvite,
    dismissNotification,
    refreshData: refreshGlobeInboxData,
    needsLogin: globeInboxNeedsLogin,
    bridgeError: globeInboxError,
  } = useGlobeInbox(true);
  const { count: mediaPoolCount } = useMediaPool(true);

  useEffect(() => {
    if (layerMode !== "personal") {
      return;
    }
    runSilentPassiveLocationResolves();
  }, [layerMode]);
  const bridgeGhostClusters = useMemo(
    () => projectBridgeGhostClusters(pendingBridgeInvites),
    [pendingBridgeInvites],
  );
  const seenBridgeToastRef = useRef(new Set<string>());
  const seenMarketAlignToastRef = useRef(new Set<string>());
  const seenInboxCountRef = useRef(0);
  const [bridgeGhostOpen, setBridgeGhostOpen] = useState(false);
  const [bridgeGhostInvite, setBridgeGhostInvite] =
    useState<PendingBridgeInvite | null>(null);
  const [bridgeGhostCluster, setBridgeGhostCluster] = useState<PinCluster | null>(
    null,
  );
  const [globeInboxOpen, setGlobeInboxOpen] = useState(false);
  const [fieldSheetOpen, setFieldSheetOpen] = useState(false);
  const [captureSheetOpen, setCaptureSheetOpen] = useState(false);
  useEffect(() => {
    return subscribeFieldSheetOpenState(setFieldSheetOpen);
  }, []);
  useEffect(() => {
    return subscribeCaptureSheetOpen(setCaptureSheetOpen);
  }, []);
  const fieldOverlayOpen = fieldSheetOpen;
  const [mediaPoolOpen, setMediaPoolOpen] = useState(false);
  const [poolAttachIds, setPoolAttachIds] = useState<string[]>([]);
  const [poolSuggestedStart, setPoolSuggestedStart] = useState<string | null>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareEventId, setShareEventId] = useState<string | null>(null);
  const [activeCluster, setActiveCluster] = useState<PinCluster | null>(null);
  const lodgingDiscovery = useGlobeLodgingDiscoverySession({
    globeRef,
    userLat: liveLocation?.lat ?? null,
    userLng: liveLocation?.lng ?? null,
    contextEventId: activeCluster?.eventId ?? null,
  });
  const eateryDiscovery = useGlobeEateryDiscoverySession({
    globeRef,
    userLat: liveLocation?.lat ?? null,
    userLng: liveLocation?.lng ?? null,
    contextEventId: activeCluster?.eventId ?? null,
  });
  const discoveryReelSessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const session = eateryDiscovery.session ?? lodgingDiscovery.session;
    if (!session || session.searching || session.items.length === 0) {
      return;
    }
    const key = `${session.eventId}:${session.items.map((row) => row.resourceId).join("|")}`;
    if (discoveryReelSessionKeyRef.current === key) {
      return;
    }
    discoveryReelSessionKeyRef.current = key;
    dispatchGlobeResourceReelFocus({
      contextEventId: session.eventId,
      surface: "list",
      source: "discovery_card",
    });
  }, [eateryDiscovery.session, lodgingDiscovery.session]);
  const [placeVerifyEventId, setPlaceVerifyEventId] = useState<string | null>(null);
  const [knowledgePlacementPending, setKnowledgePlacementPending] =
    useState<GlobeKnowledgePlacementPending | null>(null);
  useEffect(() => {
    setKnowledgePlacementPending(readGlobeKnowledgePlacementPending());
  }, []);
  const [brainProjectionEventId, setBrainProjectionEventId] = useState<string | null>(null);
  const [brainSurfaceBatch, setBrainSurfaceBatch] =
    useState<BrainSurfaceProjectionBatch | null>(null);
  const [brainSurfaceLaunchToken, setBrainSurfaceLaunchToken] = useState(0);
  const [brainSurfaceMode, setBrainSurfaceMode] = useState<"spread" | "focused">("spread");
  const [brainSurfaceFocusedFamily, setBrainSurfaceFocusedFamily] =
    useState<BrainSurfaceCandidateFamily | null>(null);
  const [brainSurfaceActiveCandidateId, setBrainSurfaceActiveCandidateId] =
    useState<string | null>(null);
  const [brainSurfaceDetailMode, setBrainSurfaceDetailMode] = useState(false);
  const [brainSurfaceShadowExpanded, setBrainSurfaceShadowExpanded] = useState(false);
  const [brainSurfaceHighlightedInferredId, setBrainSurfaceHighlightedInferredId] =
    useState<string | null>(null);
  const [brainSurfaceCommitPending, setBrainSurfaceCommitPending] = useState(false);
  const [placeActionGraphOpen, setPlaceActionGraphOpen] = useState(false);
  const [graphCommandRevision, setGraphCommandRevision] = useState(0);
  const [osakaDemoRunning, setOsakaDemoRunning] = useState(false);
  const [osakaDemoProgress, setOsakaDemoProgress] =
    useState<Osaka30sDemoProgress | null>(null);
  const [osakaDemoTheater, setOsakaDemoTheater] = useState(() =>
    readOsakaDemoTheaterState(),
  );
  const [osakaDemoApproving, setOsakaDemoApproving] = useState(false);
  const osakaDemoInFlightRef = useRef(false);
  const [mapVideoPlaying, setMapVideoPlaying] = useState(false);
  const spatialTraceTourSessionRef = useRef<string | null>(null);
  const spatialTraceTourSuppressedRef = useRef(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pinSheetInitialPage, setPinSheetInitialPage] =
    useState<PinMediaContextPage>("media");
  const [timeFilter, setTimeFilter] = useState<GlobeContextTimeFilter>("all");
  const [peopleFilter, setPeopleFilter] = useState<GlobeContextPeopleFilter>(null);
  const [peerOptionsRevision, setPeerOptionsRevision] = useState(0);
  const [pinDragOverrides, setPinDragOverrides] = useState<
    Map<string, { lat: number; lng: number }>
  >(() => new Map());
  const draggedEventIdRef = useRef<string | null>(null);
  const pinDragActiveRef = useRef(false);
  const revertTimerRef = useRef<number | null>(null);
  const stackClustersRef = useRef<PinCluster[] | null>(null);
  const activeClusterRef = useRef<PinCluster | null>(null);
  const sheetOpenRef = useRef(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDraft, setConfirmDraft] = useState<GlobePhotoIngestDraft | null>(null);
  const [confirmPreparing, setConfirmPreparing] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [photoFileProgress, setPhotoFileProgress] = useState<PhotoIngestFileItem[]>([]);
  const photoFileProgressRef = useRef<PhotoIngestFileItem[]>([]);
  const [photoRetryingIndex, setPhotoRetryingIndex] = useState<number | null>(null);
  const [photoDropActive, setPhotoDropActive] = useState(false);
  const photoDropDepthRef = useRef(0);
  const [photoUndoPayload, setPhotoUndoPayload] = useState<GlobePhotoIngestUndoPayload | null>(
    null,
  );
  const createPhotoRef = useRef<HTMLInputElement>(null);
  const [listOpen, setListOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [identityProfileOpen, setIdentityProfileOpen] = useState(false);
  const [identityVaultFocus, setIdentityVaultFocus] = useState(false);
  const [paymentVaultFocus, setPaymentVaultFocus] = useState(false);
  const [stackClusters, setStackClusters] = useState<PinCluster[] | null>(null);
  const [clustersRevision, setClustersRevision] = useState(0);
  const [globeClusters, setGlobeClusters] = useState<readonly PinCluster[]>([]);
  const [mediaStoreRevision, setMediaStoreRevision] = useState(0);
  const [projectionRevision, setProjectionRevision] = useState(0);
  const [hubDetailOpen, setHubDetailOpen] = useState(false);
  const [contextConditionPanelOpen, setContextConditionPanelOpen] = useState(false);
  const [contextConditionPanelEventId, setContextConditionPanelEventId] = useState<
    string | null
  >(null);
  const contextConditionPanelOpenRef = useRef(false);
  contextConditionPanelOpenRef.current = contextConditionPanelOpen;
  const [contextAgentSession, setContextAgentSession] = useState<GlobeContextAgentDetail>(
    () => readGlobeContextAgentSession(),
  );
  const [contextConditionDiscoveryOverlay, setContextConditionDiscoveryOverlay] =
    useState<ContextConditionDiscoveryOverlay | null>(() =>
      readContextConditionDiscoveryOverlay(),
    );
  const [discoveryLensSession, setDiscoveryLensSession] =
    useState<DiscoveryLensSession | null>(() => {
      const eventId = readGlobeContextAgentSession().boundEventId?.trim();
      return eventId ? readDiscoveryLensSession(eventId) : null;
    });
  const [mapMediaFocusOpen, setMapMediaFocusOpen] = useState(false);
  const [contextTapPhase, setContextTapPhase] =
    useState<ContextMapTapPhase>("awaiting_replay");
  const [mapMediaReplayDismissedEventId, setMapMediaReplayDismissedEventId] =
    useState<string | null>(null);
  /** Bumps when Workspace expand/collapse so 3D media ownership updates. */
  const [workspaceMapOwnerTick, setWorkspaceMapOwnerTick] = useState(0);
  const contextTapPhaseRef = useRef<ContextMapTapPhase>("awaiting_replay");
  const clustersRef = useRef<readonly PinCluster[]>([]);
  const autoBrainSurfaceLaunchKeyRef = useRef<string | null>(null);
  const brainSurfaceBatchRef = useRef<BrainSurfaceProjectionBatch | null>(null);
  const brainSurfaceActiveCandidateIdRef = useRef<string | null>(null);
  const brainSurfaceLaunchInFlightRef = useRef<string | null>(null);

  useEffect(() => {
    const bumpOwner = () => setWorkspaceMapOwnerTick((n) => n + 1);
    const unsubExpand = subscribeContextWorkspaceExpand((detail) => {
      bumpOwner();
      const id = detail.contextEventId.trim();
      if (!id) return;
      // Workspace MapLibre owns media while expanded — stop 3D autoplay.
      setContextTapPhase("awaiting_replay");
      setMapMediaReplayDismissedEventId(id);
    });
    const onClose = () => bumpOwner();
    window.addEventListener(CONTEXT_WORKSPACE_CLOSE, onClose);
    return () => {
      unsubExpand();
      window.removeEventListener(CONTEXT_WORKSPACE_CLOSE, onClose);
    };
  }, []);

  useEffect(() => {
    return subscribeContextConditionDiscoveryOverlay((next) => {
      if (contextConditionPanelOpenRef.current || isGlobeComposeInputFocused()) {
        return;
      }
      setContextConditionDiscoveryOverlay(next);
    });
  }, []);

  useEffect(() => {
    return subscribeDiscoveryLensSession((next) => {
      if (contextConditionPanelOpenRef.current || isGlobeComposeInputFocused()) {
        return;
      }
      setDiscoveryLensSession(next);
    });
  }, []);

  useEffect(() => {
    return subscribeGlobeMapMediaFocus((detail) => {
      setMapMediaFocusOpen(detail.open);
    });
  }, []);

  useEffect(() => subscribeLodgingDiscoveryResourceOperations(), []);

  useEffect(() => {
    return subscribeProjectionStore(() => {
      if (contextConditionPanelOpenRef.current || isGlobeComposeInputFocused()) {
        return;
      }
      setProjectionRevision((value) => value + 1);
    });
  }, []);

  useEffect(() => {
    const eventId = marketFocusEventId?.trim();
    if (!eventId || layerMode !== "personal") {
      return;
    }
    const event =
      findLifeEventCandidate(eventId) ?? recoverGlobeContextEventFromPin(eventId);
    const intent = findMarketIntentByEventId(eventId);
    writeGlobeResumeSession({
      eventId,
      title: intent?.title?.trim() || event?.title?.trim() || "맞춤",
      placeLabel: intent?.placeLabel?.trim() || event?.place?.trim() || null,
      kind: "market",
    });
  }, [layerMode, marketFocusEventId]);

  /** Hub activates only when user touches a context pin — not proactive. */
  const hubEventId = activeCluster?.eventId?.trim() || null;

  useEffect(() => {
    setHubDetailOpen(false);
  }, [hubEventId]);

  useEffect(() => {
    const boundEventId =
      contextAgentSession.phase === "bound"
        ? contextAgentSession.boundEventId?.trim() || null
        : null;
    const eventId = activeCluster?.eventId?.trim() ?? boundEventId;
    const anchorCluster =
      activeCluster ??
      (boundEventId ? resolveGlobeContextCardPinCluster(boundEventId) : null);

    publishGlobeTouchedContext({
      eventId,
      placeLabel: anchorCluster?.placeLabel ?? null,
      lat: anchorCluster?.lat ?? null,
      lng: anchorCluster?.lng ?? null,
    });

    // Only clear when a stale arm/bind remains with no pin — never re-emit
    // idle→idle (that re-triggers this effect via a new session object → #185).
    if (!eventId && contextAgentSession.phase !== "idle") {
      setContextConditionPanelOpen(false);
      closeGlobeContextConditionPanel();
      clearGlobeContextAgent();
    }
  }, [activeCluster, contextAgentSession]);

  useEffect(() => {
    return subscribeGlobeContextAgent((detail) => {
      setContextAgentSession((prev) =>
        prev.phase === detail.phase && prev.boundEventId === detail.boundEventId
          ? prev
          : detail,
      );
    });
  }, []);

  const contextAgentBoundEventId =
    contextAgentSession.phase === "bound"
      ? contextAgentSession.boundEventId?.trim() || null
      : null;

  const contextAgentAnchorCluster = useMemo((): PinCluster | null => {
    void clustersRevision;
    if (!contextAgentBoundEventId) {
      return null;
    }
    const activeId = activeCluster?.eventId?.trim();
    if (activeId === contextAgentBoundEventId && activeCluster) {
      return activeCluster;
    }
    const fromGlobe = globeClusters.find(
      (cluster) => cluster.eventId?.trim() === contextAgentBoundEventId,
    );
    if (fromGlobe) {
      return fromGlobe;
    }
    return resolveGlobeContextCardPinCluster(contextAgentBoundEventId);
  }, [activeCluster, clustersRevision, contextAgentBoundEventId, globeClusters]);

  const contextAgentFocusLocked = Boolean(contextAgentBoundEventId);
  const contextAgentSurfacesActive =
    contextAgentSession.phase === "arming" || contextAgentSession.phase === "bound";

  const dismissCompetingGlobeSurfaces = useCallback(() => {
    setSheetOpen(false);
    setHubDetailOpen(false);
    setBrainProjectionEventId(null);
    setBrainSurfaceBatch(null);
    clearPlaceExploreSession();
    setPlaceActionGraphOpen(false);
    setPortalOpen(false);
    setGlobeChatOpen(false);
    setBridgeGhostOpen(false);
  }, []);

  useEffect(() => {
    let wasOpen = false;
    return subscribeGlobeContextConditionPanel((detail) => {
      // Open/close only — bind + dismiss already ran in bindContextAgentToEventId.
      setContextConditionPanelOpen(detail.open);
      const nextId = detail.eventId?.trim() || null;
      setContextConditionPanelEventId(detail.open ? nextId : null);
      if (!detail.open && wasOpen) {
        // Flush snapshots skipped while the assistant panel owned the main thread.
        setGlobeClusters(clustersRef.current);
        setClustersRevision((value) => value + 1);
        setGraphCommandRevision((value) => value + 1);
      }
      wasOpen = detail.open;
    });
  }, []);

  useEffect(() => {
    if (!contextAgentSurfacesActive) {
      return;
    }
    setSheetOpen(false);
    setHubDetailOpen(false);
  }, [contextAgentSurfacesActive]);

  const detailLevelRef = useRef<GlobeDetailLevel>("space");
  const lastPinPressAtRef = useRef(0);
  const bindContextAgentToEventIdRef = useRef<(eventId: string) => void>(() => {});

  const onClustersSnapshot = useCallback((clusters: readonly PinCluster[]) => {
    clustersRef.current = clusters;
    // Don't setState while the assistant owns the main thread for IME.
    if (contextConditionPanelOpenRef.current) {
      return;
    }
    setGlobeClusters(clusters);
    setClustersRevision((value) => value + 1);
  }, []);

  const onDetailLevelChange = useCallback((level: GlobeDetailLevel) => {
    detailLevelRef.current = level;
  }, []);

  const schedulePinRevertToCardPlace = useCallback((eventId: string) => {
    if (revertTimerRef.current !== null) {
      window.clearTimeout(revertTimerRef.current);
    }
    revertTimerRef.current = window.setTimeout(() => {
      revertTimerRef.current = null;
      revertGlobeContextPinToCardPlace(eventId);
      const cardCluster = resolveGlobeContextCardPinCluster(eventId);
      if (cardCluster) {
        globeRef.current?.flyToPin(cardCluster.lat, cardCluster.lng, "neighborhood");
      }
    }, PIN_REVERT_MS);
  }, []);

  const clearActiveContext = useCallback((options?: { force?: boolean }) => {
    const session = readGlobeContextAgentSession();
    if (!options?.force && session.phase === "bound" && session.boundEventId) {
      setSheetOpen(false);
      setHubDetailOpen(false);
      setPinSheetInitialPage("media");
      return;
    }

    if (options?.force && session.phase === "bound") {
      closeGlobeContextConditionPanel();
      clearGlobeContextAgent();
      resetContextAgentRuntime();
    }

    const eventId =
      draggedEventIdRef.current?.trim() || activeCluster?.eventId?.trim() || null;
    const hadDragPreview = pinDragActiveRef.current;

    if (revertTimerRef.current !== null) {
      window.clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }

    setSheetOpen(false);
    setActiveCluster(null);
    setStackClusters(null);
    setContextTapPhase("awaiting_replay");
    setPinDragOverrides(new Map());
    pinDragActiveRef.current = false;
    draggedEventIdRef.current = null;
    exitContextSoloStage({ onlyIfContextEventId: eventId });

    if (eventId && hadDragPreview) {
      schedulePinRevertToCardPlace(eventId);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.has("recallEvent")) {
      params.delete("recallEvent");
      const next = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState(null, "", next);
    }
  }, [activeCluster?.eventId, schedulePinRevertToCardPlace]);

  // ADR-027 — lock Globe home to personal; no discovery-planet toggle.
  useEffect(() => {
    setLayerMode("personal");
  }, [setLayerMode]);

  const openContextCluster = useCallback(
    (
      cluster: PinCluster,
      options?: {
        openSheet?: boolean;
        mapTap?: boolean;
        sheetPage?: PinOpenInitialPage;
      },
    ) => {
      const eventId = cluster.eventId?.trim();
      if (eventId && readGlobeContextAgentSession().phase === "arming") {
        bindContextAgentToEventIdRef.current(eventId);
        return;
      }
      if (eventId && isGlobeContextSwitchBlocked(eventId)) {
        snapGlobeToContextAgentAnchor(globeRef, cluster);
        toast.message(copy.globe.contextAgentLockedToContext);
        return;
      }

      if (readGlobeContextAgentSession().phase !== "bound") {
        globeRef.current?.flyToPin(cluster.lat, cluster.lng, "neighborhood");
      }
      setStackClusters(null);
      setActiveCluster(cluster);

      if (
        eventId &&
        !isExternalPinCluster(cluster) &&
        cluster.variant !== "bridge_ghost"
      ) {
        enterContextSoloStage(eventId);
      }

      const event = eventId
        ? findLifeEventCandidate(eventId) ??
          recoverGlobeContextEventFromPin(eventId)
        : null;

      if (eventId && event) {
        writeGlobeResumeSession({
          eventId,
          title: cluster.title?.trim() || event.title,
          placeLabel: cluster.placeLabel?.trim() || event.place,
          kind: "context",
        });
      }

      const fromMapTap =
        options?.mapTap !== false && options?.openSheet !== true;

      // Reality OS: Context Anchor → Workspace Resume (not Bridge / media first).
      if (
        fromMapTap &&
        eventId &&
        !isExternalPinCluster(cluster) &&
        cluster.variant !== "bridge_ghost"
      ) {
        const opened = tryOpenContextAnchorWorkspace({
          contextEventId: eventId,
          utterance: cluster.title,
        });
        if (opened.ok) {
          setSheetOpen(false);
          setContextTapPhase("awaiting_replay");
          toast.message(copy.globe.workspaceResumeToast);
          const params = new URLSearchParams(window.location.search);
          if (params.get("recallEvent") !== eventId) {
            params.set("recallEvent", eventId);
            window.history.replaceState(
              null,
              "",
              `${window.location.pathname}?${params.toString()}`,
            );
          }
          return;
        }
      }

      if (fromMapTap) {
        setSheetOpen(false);
        const volume = eventId ? resolveExperienceVolumeForEvent(eventId) : null;
        const hasMapMedia = globeContextShouldMapReplayFirst({
          event,
          cluster,
          volume,
        });
        setContextTapPhase(
          resolveInitialContextMapTapPhase(event, { hasMapMedia }),
        );
      } else {
        let openSheet = options?.openSheet !== false;
        if (!shouldOpenGlobeBridgeSheet()) {
          openSheet = false;
        }
        if (openSheet) {
          setPinSheetInitialPage(options?.sheetPage ?? "media");
        }
        setSheetOpen(openSheet);
        setContextTapPhase("awaiting_replay");
      }

      if (!eventId) {
        return;
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get("recallEvent") !== eventId) {
        params.set("recallEvent", eventId);
        const next = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, "", next);
      }
    },
    [],
  );

  const openMapMediaBridgeRef = useRef<(() => void) | null>(null);

  const handleSameContextRetap = useCallback(() => {
    const phase = contextTapPhaseRef.current;
    const cluster = activeClusterRef.current;
    const eventId = cluster?.eventId?.trim();
    if (!eventId || !cluster) {
      clearActiveContext();
      return;
    }

    const agentSession = readGlobeContextAgentSession();
    if (agentSession.phase === "arming") {
      bindContextAgentToEventIdRef.current(eventId);
      return;
    }

    // Reality OS: retap Anchor → Workspace when draft Entities exist.
    if (
      !isExternalPinCluster(cluster) &&
      cluster.variant !== "bridge_ghost"
    ) {
      const opened = tryOpenContextAnchorWorkspace({
        contextEventId: eventId,
        utterance: cluster.title,
      });
      if (opened.ok) {
        setSheetOpen(false);
        toast.message(copy.globe.workspaceResumeToast);
        return;
      }
    }

    if (!shouldOpenGlobeBridgeSheet()) {
      dismissCompetingGlobeSurfaces();
      // Bind (not bare open) so dismiss-guard clears and PromptFrame stays coherent.
      void bindContextAgentToEventIdRef.current(eventId);
      return;
    }

    const event =
      findLifeEventCandidate(eventId) ?? recoverGlobeContextEventFromPin(eventId);
    const volume = resolveExperienceVolumeForEvent(eventId);
    const hasMedia = globeContextShouldMapReplayFirst({
      event,
      cluster,
      volume,
    });

    if (phase === "awaiting_replay") {
      if (hasMedia) {
        setMapMediaReplayDismissedEventId(null);
        setContextTapPhase("media_open");
      } else {
        openMapMediaBridgeRef.current?.();
      }
      return;
    }

    if (phase === "media_open") {
      setMapMediaReplayDismissedEventId(eventId);
      setContextTapPhase("awaiting_replay");
      globeRef.current?.clearPinViewportBias();
    }
  }, [clearActiveContext, dismissCompetingGlobeSurfaces]);

  const markPinPress = useCallback(() => {
    lastPinPressAtRef.current = Date.now();
  }, []);

  const applyNearbyContexts = useCallback(
    (nearby: readonly PinCluster[], flyCluster?: PinCluster | null) => {
      if (readGlobeContextAgentSession().phase === "arming") {
        if (nearby.length === 0) {
          return;
        }
        if (flyCluster) {
          globeRef.current?.flyToPin(flyCluster.lat, flyCluster.lng, "neighborhood");
        }
        if (nearby.length === 1) {
          const cluster = nearby[0]!;
          if (
            !isExternalPinCluster(cluster) &&
            cluster.variant !== "bridge_ghost" &&
            cluster.eventId?.trim()
          ) {
            void bindContextAgentToEventIdRef.current(cluster.eventId.trim());
          }
          return;
        }
        setStackClusters([...nearby]);
        setActiveCluster(null);
        setSheetOpen(false);
        exitContextSoloStage();
        return;
      }

      if (nearby.length === 0) {
        if (activeClusterRef.current != null) {
          clearActiveContext();
          return;
        }
        if ((stackClustersRef.current?.length ?? 0) > 0) {
          clearActiveContext();
          return;
        }
        if (globeContextTapHitRadiusMeters(detailLevelRef.current) == null) {
          return;
        }
        clearActiveContext();
        return;
      }

      if (flyCluster) {
        globeRef.current?.flyToPin(flyCluster.lat, flyCluster.lng, "neighborhood");
      }

      if (nearby.length === 1) {
        if (activeClusterRef.current?.pinId === nearby[0]!.pinId) {
          handleSameContextRetap();
          return;
        }
        openContextCluster(nearby[0]!, { mapTap: true });
        return;
      }

      setStackClusters([...nearby]);
      setActiveCluster(null);
      setSheetOpen(false);
      exitContextSoloStage();
    },
    [clearActiveContext, handleSameContextRetap, openContextCluster],
  );

  const resolveNearbyAt = useCallback((tapLat: number, tapLng: number) => {
    return resolveGlobeContextsNearTap({
      tapLat,
      tapLng,
      clusters: clustersRef.current,
      detailLevel: detailLevelRef.current,
    });
  }, []);

  const peerOptions = useMemo(() => {
    void peerOptionsRevision;
    if (!eventsHydrated) {
      return [];
    }
    return listGlobeContextPeerOptions(listLifeEventCandidates());
  }, [eventsHydrated, peerOptionsRevision]);

  const activeContextEvent = useMemo(() => {
    const eventId =
      contextConditionPanelEventId ??
      contextAgentBoundEventId ??
      activeCluster?.eventId?.trim() ??
      null;
    if (!eventId) {
      return null;
    }
    // Panel open is client-only — allow store read immediately so PromptFrame
    // does not wait a frame on eventsHydrated and stay missing.
    if (!eventsHydrated && !contextConditionPanelOpen) {
      return null;
    }
    return findLifeEventCandidate(eventId);
  }, [
    activeCluster?.eventId,
    contextAgentBoundEventId,
    contextConditionPanelEventId,
    contextConditionPanelOpen,
    eventsHydrated,
    mediaStoreRevision,
  ]);

  useEffect(() => {
    if (!eventsHydrated) {
      return;
    }
    const eventId =
      contextConditionPanelEventId ??
      contextAgentBoundEventId ??
      activeCluster?.eventId?.trim() ??
      null;
    if (!eventId || findLifeEventCandidate(eventId)) {
      return;
    }
    const recovered = recoverGlobeContextEventFromPin(eventId);
    if (recovered) {
      setMediaStoreRevision((value) => value + 1);
    }
  }, [
    activeCluster?.eventId,
    contextAgentBoundEventId,
    contextConditionPanelEventId,
    eventsHydrated,
  ]);

  const discoveryFeedFocus = useIntelligentDiscoveryFeedFocus(activeContextEvent?.id);

  const contextAgentPanelCluster =
    contextAgentAnchorCluster ?? activeCluster;

  const contextAgentAnchorCoords = useMemo(() => {
    const cluster = contextAgentPanelCluster;
    if (cluster?.lat != null && cluster?.lng != null) {
      return { lat: cluster.lat, lng: cluster.lng };
    }
    const eventId = contextAgentBoundEventId ?? activeCluster?.eventId?.trim();
    if (!eventId) {
      return null;
    }
    const cardCluster = resolveGlobeContextCardPinCluster(eventId);
    if (cardCluster?.lat != null && cardCluster?.lng != null) {
      return { lat: cardCluster.lat, lng: cardCluster.lng };
    }
    if (!eventsHydrated) {
      return null;
    }
    const pin = findPersonalGlobePinByEventId(eventId);
    if (
      pin &&
      Number.isFinite(pin.lat) &&
      Number.isFinite(pin.lng)
    ) {
      return { lat: pin.lat, lng: pin.lng };
    }
    return null;
  }, [
    activeCluster?.eventId,
    contextAgentBoundEventId,
    contextAgentPanelCluster,
    eventsHydrated,
  ]);

  // Keep last-good panel payload so cluster flicker cannot unmount the composer mid-IME.
  const lastAgentPanelEventRef = useRef(activeContextEvent);
  const lastAgentAnchorRef = useRef(contextAgentAnchorCoords);
  if (contextConditionPanelOpen && activeContextEvent) {
    lastAgentPanelEventRef.current = activeContextEvent;
  }
  if (contextConditionPanelOpen && contextAgentAnchorCoords) {
    lastAgentAnchorRef.current = contextAgentAnchorCoords;
  }
  const contextConditionPanelEvent =
    contextConditionPanelOpen
      ? (activeContextEvent ?? lastAgentPanelEventRef.current)
      : activeContextEvent;
  const contextConditionPanelCoords =
    contextConditionPanelOpen
      ? (contextAgentAnchorCoords ?? lastAgentAnchorRef.current)
      : contextAgentAnchorCoords;

  // Keep PromptFrame open whenever the panel is open + we have an event.
  // Missing coords used to force open=false while WebGL stayed suspended → frozen UI.
  const contextConditionPromptOpen = Boolean(
    contextConditionPanelOpen && contextConditionPanelEvent,
  );
  const contextConditionPromptLat = contextConditionPanelCoords?.lat ?? 34.6937;
  const contextConditionPromptLng = contextConditionPanelCoords?.lng ?? 135.5023;
  // Freeze GPS props for PromptFrame — live ticks were re-rendering PinBar (~3k lines)
  // and stalling Korean IME by ~3s per glyph.
  const promptUserLatLngRef = useRef<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  if (!contextConditionPromptOpen) {
    promptUserLatLngRef.current = {
      lat: liveLocation?.lat ?? null,
      lng: liveLocation?.lng ?? null,
    };
  }
  const promptUserLat = contextConditionPromptOpen
    ? promptUserLatLngRef.current.lat
    : (liveLocation?.lat ?? null);
  const promptUserLng = contextConditionPromptOpen
    ? promptUserLatLngRef.current.lng
    : (liveLocation?.lng ?? null);

  const activeContextProjectionManifest = useMemo(() => {
    void projectionRevision;
    if (!activeContextEvent) {
      return null;
    }
    return readProjectionManifestForAnchor(activeContextEvent.id);
  }, [activeContextEvent, projectionRevision]);

  const { guides: activeContextMediaGuides } = useContextMediaGuides(activeContextEvent, {
    enabled: layerMode === "personal",
    max: 4,
  });

  useEffect(() => {
    brainSurfaceBatchRef.current = brainSurfaceBatch;
  }, [brainSurfaceBatch]);

  useEffect(() => {
    brainSurfaceActiveCandidateIdRef.current = brainSurfaceActiveCandidateId;
  }, [brainSurfaceActiveCandidateId]);

  useEffect(() => {
    autoBrainSurfaceLaunchKeyRef.current = null;
  }, [activeContextEvent?.id]);

  useEffect(() => {
    if (!brainSurfaceBatch) {
      autoBrainSurfaceLaunchKeyRef.current = null;
    }
  }, [brainSurfaceBatch]);

  const brainSurfaceAction = useGlobeContextBrainActions(activeContextEvent, {
    onActionHandled: () => {
      setBrainSurfaceActiveCandidateId(null);
      setBrainSurfaceDetailMode(false);
    },
  });

  const brainSurfaceVisible = Boolean(
    brainSurfaceBatch &&
      activeCluster?.eventId === brainSurfaceBatch.eventId &&
      !brainProjectionEventId &&
      !contextAgentFocusLocked &&
      layerMode === "personal" &&
      !sheetOpen &&
      !hubDetailOpen &&
      !mapMediaFocusOpen &&
      !confirmOpen &&
      !portalOpen &&
      !marketConfirmOpen &&
      !contextConditionPanelOpen,
  );

  const { visibleCandidates: visibleBrainSurfaceCandidates } =
    useBrainSurfaceProjectionReveal({
      focusedEventId: activeCluster?.eventId ?? null,
      batch: brainSurfaceVisible ? brainSurfaceBatch : null,
      launchToken: brainSurfaceLaunchToken,
    });

  const pinnedLodgingResourceId = useMemo(
    () => readPinnedLodgingResourceId(activeContextEvent),
    [activeContextEvent],
  );
  const pinnedEateryResourceId = useMemo(
    () => readPinnedEateryResourceId(activeContextEvent),
    [activeContextEvent],
  );
  const passiveBrainSurfaceFamily =
    brainSurfaceMode === "focused"
      ? null
      : pinnedLodgingResourceId
        ? "lodging"
        : pinnedEateryResourceId
          ? "eatery"
          : null;

  const brainSurfaceCandidatesById = useMemo(() => {
    const map = new Map<string, BrainSurfaceProjectionCandidate>();
    for (const candidate of brainSurfaceBatch?.candidates ?? []) {
      map.set(candidate.id, candidate);
    }
    return map;
  }, [brainSurfaceBatch?.candidates]);

  const activeBrainSurfaceCandidate = brainSurfaceActiveCandidateId
    ? brainSurfaceCandidatesById.get(brainSurfaceActiveCandidateId) ?? null
    : null;

  const activeBrainSurfaceNode = useMemo(() => {
    if (!activeContextEvent || !activeBrainSurfaceCandidate?.nodeId) {
      return null;
    }
    return (
      activeContextProjectionManifest?.nodes.find(
        (node) => node.id === activeBrainSurfaceCandidate.nodeId,
      ) ?? null
    );
  }, [
    activeBrainSurfaceCandidate,
    activeContextEvent,
    activeContextProjectionManifest?.nodes,
  ]);

  const brainSurfaceDisclosureStage = useMemo(() => {
    if (activeBrainSurfaceCandidate) {
      if (brainSurfaceDetailMode && activeBrainSurfaceNode) {
        return "detail" as const;
      }
      return "related" as const;
    }
    return "core" as const;
  }, [
    activeBrainSurfaceCandidate,
    activeBrainSurfaceNode,
    brainSurfaceDetailMode,
  ]);

  const disclosedBrainSurfaceCandidates = useMemo(
    () =>
      filterBrainSurfaceCandidatesForDisclosure({
        candidates: filterVisibleBrainSurfaceCandidates(visibleBrainSurfaceCandidates),
        stage: brainSurfaceDisclosureStage,
        activeCandidate: activeBrainSurfaceCandidate,
        allCandidates: filterVisibleBrainSurfaceCandidates(
          brainSurfaceBatch?.candidates ?? [],
        ),
      }),
    [
      activeBrainSurfaceCandidate,
      brainSurfaceBatch?.candidates,
      brainSurfaceDisclosureStage,
      visibleBrainSurfaceCandidates,
    ],
  );

  const projectedBrainSurfaceCandidates = useMemo(() => {
    const videoClusterId =
      activeBrainSurfaceCandidate?.anchorKind === "video_root"
        ? activeBrainSurfaceCandidate.clusterId
        : activeBrainSurfaceCandidate?.parentGuideNodeId
          ? `media:${activeBrainSurfaceCandidate.parentGuideNodeId}`
          : activeBrainSurfaceCandidate?.sourceGuideNodeId
            ? `media:${activeBrainSurfaceCandidate.sourceGuideNodeId}`
            : null;

    const sourceCandidates = brainSurfaceShadowExpanded
      ? (brainSurfaceBatch?.candidates ?? visibleBrainSurfaceCandidates)
      : brainSurfaceDisclosureStage === "core"
        ? disclosedBrainSurfaceCandidates
        : prioritizeBrainSurfaceCandidatesForFocus({
            candidates: disclosedBrainSurfaceCandidates,
            focusedFamily:
              brainSurfaceMode === "focused"
                ? brainSurfaceFocusedFamily
                : passiveBrainSurfaceFamily,
            activeCandidateId: brainSurfaceActiveCandidateId,
            gravityMode:
              brainSurfaceMode === "focused"
                ? "focused"
                : passiveBrainSurfaceFamily
                  ? "pinned"
                  : null,
          });

    const hubLat = activeCluster?.lat;
    const hubLng = activeCluster?.lng;
    // Travel context (오사카) must hub at destination — not viewer GPS in 서울.
    const contextHub =
      activeContextEvent &&
      brainSurfaceBatch?.eventId === activeContextEvent.id
        ? resolveStableContextPlaceAnchor(activeContextEvent)
        : null;
    const hub =
      contextHub &&
      Number.isFinite(hubLat) &&
      Number.isFinite(hubLng) &&
      haversineKm(contextHub.lat, contextHub.lng, hubLat as number, hubLng as number) >
        CONTEXT_ANCHOR_NEAR_KM
        ? { lat: contextHub.lat, lng: contextHub.lng }
        : contextHub && (!Number.isFinite(hubLat) || !Number.isFinite(hubLng))
          ? { lat: contextHub.lat, lng: contextHub.lng }
          : Number.isFinite(hubLat) && Number.isFinite(hubLng)
            ? { lat: hubLat as number, lng: hubLng as number }
            : contextHub
              ? { lat: contextHub.lat, lng: contextHub.lng }
              : null;

    return resolveBrainSurfaceMapMarkers({
      candidates: sourceCandidates,
      disclosureStage: brainSurfaceShadowExpanded
        ? "related"
        : brainSurfaceDisclosureStage,
      activeCandidateId: brainSurfaceHighlightedInferredId ?? brainSurfaceActiveCandidateId,
      shadowExpanded: brainSurfaceShadowExpanded,
      videoClusterId,
      videoGuideNodeId:
        activeBrainSurfaceCandidate?.sourceGuideNodeId ??
        activeBrainSurfaceCandidate?.parentGuideNodeId ??
        null,
      hubLat: hub?.lat ?? null,
      hubLng: hub?.lng ?? null,
      storySpread: !brainSurfaceShadowExpanded,
    });
  }, [
    activeBrainSurfaceCandidate,
    activeCluster?.lat,
    activeCluster?.lng,
    activeContextEvent,
    brainSurfaceActiveCandidateId,
    brainSurfaceBatch?.candidates,
    brainSurfaceBatch?.eventId,
    brainSurfaceDisclosureStage,
    brainSurfaceFocusedFamily,
    brainSurfaceHighlightedInferredId,
    brainSurfaceMode,
    brainSurfaceShadowExpanded,
    disclosedBrainSurfaceCandidates,
    passiveBrainSurfaceFamily,
    visibleBrainSurfaceCandidates,
  ]);

  const brainSurfaceTraceArcs = useMemo((): readonly GlobeTripArc[] => {
    if (!brainSurfaceShadowExpanded || !activeBrainSurfaceCandidate?.clusterId) {
      return [];
    }
    const root = projectedBrainSurfaceCandidates.find(
      (row) => row.anchorKind === "video_root",
    );
    if (!root) {
      return [];
    }
    const places = projectedBrainSurfaceCandidates.filter(
      (row) => row.anchorKind === "inferred_place",
    );
    return buildBrainSurfaceSpatialTraceArcs({
      root,
      places,
      clusterId: activeBrainSurfaceCandidate.clusterId,
    });
  }, [
    activeBrainSurfaceCandidate,
    brainSurfaceShadowExpanded,
    projectedBrainSurfaceCandidates,
  ]);

  const graphCommandMarkers = useMemo(() => {
    void graphCommandRevision;
    const eventId =
      contextAgentBoundEventId?.trim() ||
      activeContextEvent?.id?.trim() ||
      brainSurfaceBatch?.eventId?.trim() ||
      null;
    if (!eventId) {
      return [];
    }
    const graph = readSessionGraph(eventId);
    if (!graph) {
      return [];
    }
    const markers = [...projectSessionGraphToBrainCandidates(graph)];
    // Map-needed work stays off Globe until Workspace Commit.
    const hidden = globeFamiliesHiddenByWorkspace(eventId);
    if (hidden.size > 0) {
      return markers.filter((marker) => !hidden.has(marker.family));
    }
    // Field scout inventory owns lodging map — hide stale APA graph lodging.
    const lastBatch = readContextConditionLastBatch(eventId);
    if (!fieldScoutOwnsLodgingGraphMarkers(lastBatch)) {
      return markers;
    }
    return markers.filter((marker) => marker.family !== "lodging");
  }, [
    activeContextEvent?.id,
    brainSurfaceBatch?.eventId,
    contextAgentBoundEventId,
    graphCommandRevision,
  ]);

  const osakaDemoTheaterActive =
    osakaDemoRunning ||
    Boolean(osakaDemoProgress) ||
    osakaDemoTheater.active;

  const osakaDemoGraphMarkers = useMemo(() => {
    if (!osakaDemoTheaterActive) {
      return [];
    }
    const eventId =
      osakaDemoProgress?.contextEventId?.trim() ||
      osakaDemoTheater.contextEventId?.trim() ||
      contextAgentBoundEventId?.trim() ||
      null;
    if (!eventId) {
      return [];
    }
    void graphCommandRevision;
    const graph = readSessionGraph(eventId);
    if (!graph) {
      return [];
    }
    return [...projectSessionGraphToBrainCandidates(graph)];
  }, [
    contextAgentBoundEventId,
    graphCommandRevision,
    osakaDemoProgress?.contextEventId,
    osakaDemoTheater.contextEventId,
    osakaDemoTheaterActive,
  ]);

  const { revealedMarkers: osakaDemoRevealedMarkers } =
    useOsakaDemoMarkerReveal({
      active: osakaDemoTheaterActive,
      stepId: osakaDemoProgress?.stepId ?? osakaDemoTheater.stepId,
      stepStatus: osakaDemoProgress?.status ?? null,
      markers: osakaDemoGraphMarkers,
    });

  const hubBrainSurfaceMarkers = useMemo(() => {
    if (osakaDemoTheaterActive) {
      return osakaDemoRevealedMarkers;
    }
    if (brainSurfaceVisible) {
      return [...projectedBrainSurfaceCandidates, ...graphCommandMarkers];
    }
    return graphCommandMarkers;
  }, [
    brainSurfaceVisible,
    graphCommandMarkers,
    osakaDemoRevealedMarkers,
    osakaDemoTheaterActive,
    projectedBrainSurfaceCandidates,
  ]);

  const osakaDemoCompareArcs = useMemo(() => {
    if (!osakaDemoTheaterActive || !osakaDemoTheater.showCompareArcs) {
      return [];
    }
    const eventId =
      osakaDemoProgress?.contextEventId?.trim() ||
      osakaDemoTheater.contextEventId?.trim() ||
      null;
    if (!eventId) {
      return [];
    }
    void graphCommandRevision;
    return [...projectSessionGraphCompareArcs(readSessionGraph(eventId))];
  }, [
    graphCommandRevision,
    osakaDemoProgress?.contextEventId,
    osakaDemoTheater.contextEventId,
    osakaDemoTheater.showCompareArcs,
    osakaDemoTheaterActive,
  ]);

  // Session-graph compare arcs (Action Planner / Graph) — always when not Osaka-only.
  // (defined after useRealitySurfaceProjection — needs realitySurfaceEventId)

  const brainSurfaceTracePlaces = useMemo(
    () =>
      brainSurfaceShadowExpanded
        ? projectedBrainSurfaceCandidates.filter((row) => row.markerStyle === "trace")
        : [],
    [brainSurfaceShadowExpanded, projectedBrainSurfaceCandidates],
  );

  const brainSurfaceConnectRelated = useMemo(() => {
    if (!activeBrainSurfaceCandidate) {
      return [] as BrainSurfaceProjectionCandidate[];
    }
    return resolveRelatedBrainSurfaceCandidates({
      active: activeBrainSurfaceCandidate,
      candidates: filterVisibleBrainSurfaceCandidates(
        brainSurfaceBatch?.candidates ?? visibleBrainSurfaceCandidates,
      ),
    });
  }, [
    activeBrainSurfaceCandidate,
    brainSurfaceBatch?.candidates,
    visibleBrainSurfaceCandidates,
  ]);

  const activeBrainSurfaceGuide = useMemo(() => {
    const guideId = activeBrainSurfaceCandidate?.sourceGuideNodeId?.trim();
    if (!guideId) {
      return null;
    }
    return (
      activeContextMediaGuides.find((guide) => guide.guideNodeId === guideId) ??
      queryMediaGuideByGuideNodeId(guideId)
    );
  }, [
    activeBrainSurfaceCandidate?.sourceGuideNodeId,
    activeContextMediaGuides,
  ]);

  const activeVideoInferredPlaceCount = useMemo(() => {
    const candidate = activeBrainSurfaceCandidate;
    if (!candidate) {
      return 0;
    }
    if (candidate.anchorKind === "video_root" && brainSurfaceBatch) {
      const clusterId = candidate.clusterId;
      if (clusterId) {
        const guideId =
          candidate.sourceGuideNodeId?.trim() ??
          candidate.parentGuideNodeId?.trim() ??
          null;
        return filterVisibleBrainSurfaceCandidates(
          filterBrainSurfaceShadowExpandPins(brainSurfaceBatch.candidates, {
            clusterId,
            guideId,
          }),
        ).length;
      }
    }
    return activeBrainSurfaceGuide?.inferredPlaceCandidates.length ?? 0;
  }, [activeBrainSurfaceCandidate, activeBrainSurfaceGuide, brainSurfaceBatch]);

  const showActiveVideoExpandMap = Boolean(
    activeBrainSurfaceCandidate?.anchorKind === "video_root" &&
      (activeVideoInferredPlaceCount > 0 ||
        (activeBrainSurfaceCandidate.spatialTraceItems?.length ?? 0) > 0),
  );

  const spatialTraceTourGuideId = useMemo(() => {
    const videoRoot = brainSurfaceBatch?.candidates.find(
      (candidate) => candidate.anchorKind === "video_root",
    );
    return videoRoot?.sourceGuideNodeId?.trim() ?? null;
  }, [brainSurfaceBatch?.candidates]);

  const spatialTraceTourStops = useMemo(() => {
    if (mapVideoPlaying && activeContextMediaGuides.length > 0) {
      const guide = pickPrimaryExpandableMediaGuide(activeContextMediaGuides);
      if (guide?.embedUrl?.trim()) {
        return buildMediaSpatialTraceTourStopsFromGuide(guide);
      }
    }
    return [];
  }, [activeContextMediaGuides, mapVideoPlaying]);

  const spatialTraceTourAdvancePaused = Boolean(
    activeBrainSurfaceCandidate?.embedUrl &&
      activeBrainSurfaceCandidate.anchorKind === "video_root",
  );

  const {
    activeStop: spatialTraceTourActiveStop,
    isRunning: spatialTraceTourRunning,
    stopIndex: spatialTraceTourStopIndex,
    stopCount: spatialTraceTourStopCount,
    startTour: startSpatialTraceTour,
    stopTour: stopSpatialTraceTour,
  } = useMediaSpatialTraceTour({
    globeRef,
    stops: spatialTraceTourStops,
    advancePaused: spatialTraceTourAdvancePaused,
  });

  /** Context Brief → 3D fly when Workspace (2D) is collapsed. */
  useGlobeBriefReplay({ globeRef });

  const dismissBrainSurfacePreview = useCallback(() => {
    spatialTraceTourSuppressedRef.current = true;
    spatialTraceTourSessionRef.current = null;
    stopSpatialTraceTour();
    setBrainSurfaceShadowExpanded(false);
    setBrainSurfaceHighlightedInferredId(null);
    setBrainSurfaceActiveCandidateId(null);
    setBrainSurfaceDetailMode(false);
    setBrainSurfaceMode("spread");
    setBrainSurfaceFocusedFamily(null);
    clearPlaceExploreSession();
    setPlaceActionGraphOpen(false);
  }, [stopSpatialTraceTour]);

  const activeBrainSurfacePresentation = activeBrainSurfaceNode
    ? resolveProjectionNodePresentation(activeBrainSurfaceNode)
    : null;
  const activeBrainSurfaceExplanation =
    activeBrainSurfaceNode && activeContextEvent
      ? buildProjectionNodeExplanation({
          node: activeBrainSurfaceNode,
          manifest: readProjectionManifestForAnchor(activeContextEvent.id),
          event: activeContextEvent,
        })
      : null;
  const activeBrainSurfaceManifest = activeContextProjectionManifest;
  const activeBrainSurfacePill =
    activeBrainSurfaceNode?.kind === "ghost"
      ? (activeBrainSurfaceManifest?.pills.find(
          (pill) =>
            pill.linkedNodeId === activeBrainSurfaceNode.id ||
            pill.ghostAxisId === activeBrainSurfaceNode.axisId,
        ) ?? null)
      : null;
  const discoveryEventId = useMemo(
    () =>
      eateryDiscovery.session?.eventId ??
      lodgingDiscovery.session?.eventId ??
      null,
    [eateryDiscovery.session?.eventId, lodgingDiscovery.session?.eventId],
  );

  const {
    payload: priorityPayload,
    chooseLearn: choosePriorityLearn,
    dismissLearn: dismissPriorityLearn,
  } = usePriorityStrip({
    event: activeContextEvent,
    lat: liveLocation?.lat ?? null,
    lng: liveLocation?.lng ?? null,
    workQueue: workQueueItems,
    discoveryEventId,
  });

  const {
    session: realitySurfaceSession,
    projection: realitySurfaceProjection,
    activeEventId: realitySurfaceEventId,
    setFromGlobeIngress,
    clearSession: clearRealitySurfaceSession,
    gateOperatorMessage,
    advanceDestination,
    confirmDepartureHub,
    tryAdvanceDestinationFromMessage,
    approveExecutionPlan,
  } = useRealitySurfaceProjection();

  const sessionGraphCompareArcs = useMemo(() => {
    if (osakaDemoTheaterActive) {
      return [];
    }
    const eventId =
      activeCluster?.eventId?.trim() ||
      realitySurfaceEventId?.trim() ||
      null;
    if (!eventId) {
      return [];
    }
    void graphCommandRevision;
    return [...projectSessionGraphCompareArcs(readSessionGraph(eventId))];
  }, [
    activeCluster?.eventId,
    graphCommandRevision,
    osakaDemoTheaterActive,
    realitySurfaceEventId,
  ]);

  const [departureHubPickerOpen, setDepartureHubPickerOpen] = useState(false);

  const visibleRealitySurfaceProjection = useMemo(() => {
    const clusterId = activeCluster?.eventId?.trim() ?? null;
    if (!clusterId) {
      return null;
    }

    const bridgeTruth =
      activeContextEvent?.id === clusterId
        ? readBridgePlanningTruth(activeContextEvent)
        : null;
    if (bridgeTruth) {
      return composeRealitySurfaceFromBridgeTruth({
        eventId: clusterId,
        truth: bridgeTruth,
        goalKo: activeContextEvent?.title ?? null,
      });
    }

    if (clusterId !== realitySurfaceEventId) {
      return null;
    }
    return realitySurfaceProjection;
  }, [
    activeCluster?.eventId,
    activeContextEvent,
    realitySurfaceEventId,
    realitySurfaceProjection,
  ]);

  const realityBridgeArcs = useMemo(() => {
    if (osakaDemoTheaterActive) {
      return osakaDemoCompareArcs;
    }
    const eventId = activeCluster?.eventId?.trim() ?? null;
    const bridge =
      eventId && visibleRealitySurfaceProjection
        ? projectBridgeMapArcs({
            eventId,
            projection: visibleRealitySurfaceProjection,
            userLat: liveLocation?.lat ?? null,
            userLng: liveLocation?.lng ?? null,
          })
        : [];
    return [...bridge, ...sessionGraphCompareArcs];
  }, [
    activeCluster?.eventId,
    liveLocation?.lat,
    liveLocation?.lng,
    osakaDemoCompareArcs,
    osakaDemoTheaterActive,
    sessionGraphCompareArcs,
    visibleRealitySurfaceProjection,
  ]);

  const commitPlanningTruthIfHost = useCallback(
    async (input: {
      session: RealitySurfaceSession;
      destinationLabel: string;
    }) => {
      if (!activeContextEvent?.id || !user?.id) {
        return;
      }
      const projection = input.session.projection;
      const pathLabels = projection.bridge?.pathLabels ?? [];
      const pinnedLegIndex = projection.bridge?.activeLegIndex ?? 0;
      const goalKo = projection.context?.goalKo ?? activeContextEvent.title;

      if (canCommitBridgePlanningTruth(activeContextEvent)) {
        await commitBridgePlanningTruth({
          event: activeContextEvent,
          updatedByUserId: user.id,
          destinationLabel: input.destinationLabel,
          pathLabels,
          pinnedLegIndex,
          goalKo,
          flowStrokeStyle: projection.flow?.strokeStyle,
        });
        return;
      }

      if (canProposeBridgePlanningTruth(activeContextEvent)) {
        const displayName =
          (typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null) ??
          user.email ??
          null;
        const hadOwnProposal = Boolean(
          readBridgePlanningProposalForUser(activeContextEvent, user.id),
        );
        await proposeBridgePlanningTruth({
          event: activeContextEvent,
          proposedByUserId: user.id,
          proposedByDisplayName: displayName,
          destinationLabel: input.destinationLabel,
          pathLabels,
        });
        toast.message(
          hadOwnProposal
            ? copy.globe.bridgePlanningProposalUpdated(input.destinationLabel)
            : copy.globe.bridgePlanningProposalSubmitted(input.destinationLabel),
        );
      }
    },
    [activeContextEvent, user],
  );

  const flyGlobeToDestination = useCallback((destinationLabel: string) => {
    const anchor = resolveTripContextAnchor(destinationLabel);
    if (!anchor) {
      return;
    }
    globeRef.current?.flyToPin(anchor.lat, anchor.lng, "city");
  }, []);

  useEffect(() => {
    const clusterId = activeCluster?.eventId?.trim() ?? null;
    if (realitySurfaceEventId && clusterId && clusterId !== realitySurfaceEventId) {
      clearRealitySurfaceSession();
      setDepartureHubPickerOpen(false);
    }
  }, [activeCluster?.eventId, clearRealitySurfaceSession, realitySurfaceEventId]);

  const realitySurfaceRoutingAllowed = useCallback(() => {
    if (!realitySurfaceEventId) {
      return false;
    }
    const clusterId = activeCluster?.eventId?.trim() ?? null;
    if (!clusterId) {
      return true;
    }
    return clusterId === realitySurfaceEventId;
  }, [activeCluster?.eventId, realitySurfaceEventId]);

  const gateOperatorBeforeDispatch = useCallback(
    (message: string) => {
      if (!realitySurfaceRoutingAllowed()) {
        return null;
      }
      return gateOperatorMessage(message);
    },
    [gateOperatorMessage, realitySurfaceRoutingAllowed],
  );

  const handleTryAdvanceDestinationFromMessage = useCallback(
    (message: string) => {
      if (!realitySurfaceRoutingAllowed()) {
        return null;
      }
      const result = tryAdvanceDestinationFromMessage(message);
      if (!result) {
        return null;
      }
      flyGlobeToDestination(result.destination);
      void commitPlanningTruthIfHost({
        session: result.session,
        destinationLabel: result.destination,
      });
      return composeTripFlowChatAssistantLine({
        headline: copy.globe.realitySurface.destinationConfirmed(result.destination),
        blueprint: result.session.operatorBlueprint,
        destinationLabel: result.destination,
        viewerLat: liveLocation?.lat ?? null,
        viewerLng: liveLocation?.lng ?? null,
      });
    },
    [
      commitPlanningTruthIfHost,
      flyGlobeToDestination,
      liveLocation?.lat,
      liveLocation?.lng,
      realitySurfaceRoutingAllowed,
      tryAdvanceDestinationFromMessage,
    ],
  );

  const onOperatorDestinationChoice = useCallback(
    (choice: OperatorChoiceChip) => {
      if (!realitySurfaceRoutingAllowed()) {
        return;
      }
      const advanced = advanceDestination(choice.label);
      if (advanced) {
        flyGlobeToDestination(choice.label);
        syncPortalComposeTurnToChat({
          graphId: ensureGlobeChatGraphId(),
          userText: choice.label,
          assistantText: composeTripFlowChatAssistantLine({
            headline: copy.globe.realitySurface.destinationConfirmed(choice.label),
            blueprint: advanced.operatorBlueprint,
            destinationLabel: choice.label,
            viewerLat: liveLocation?.lat ?? null,
            viewerLng: liveLocation?.lng ?? null,
          }),
        });
        void commitPlanningTruthIfHost({
          session: advanced,
          destinationLabel: choice.label,
        });
      }
    },
    [
      advanceDestination,
      commitPlanningTruthIfHost,
      flyGlobeToDestination,
      liveLocation?.lat,
      liveLocation?.lng,
      realitySurfaceRoutingAllowed,
    ],
  );

  const brainProjectionVisible = Boolean(
    brainProjectionEventId &&
      activeContextEvent?.id === brainProjectionEventId &&
      activeCluster?.eventId === brainProjectionEventId &&
      layerMode === "personal" &&
      !sheetOpen &&
      !hubDetailOpen &&
      !mapMediaFocusOpen &&
      !confirmOpen &&
      !portalOpen &&
      !marketConfirmOpen,
  );

  const tripSituationRouter = useMemo(
    () =>
      resolveTripSituationRouter({
        layerMode,
        suppressed:
          portalOpen ||
          marketConfirmOpen ||
          confirmOpen ||
          brainProjectionVisible,
        session: realitySurfaceSession,
        viewerLat: liveLocation?.lat ?? null,
        viewerLng: liveLocation?.lng ?? null,
        departurePickerOpen: departureHubPickerOpen,
      }),
    [
      brainProjectionVisible,
      confirmOpen,
      departureHubPickerOpen,
      layerMode,
      liveLocation?.lat,
      liveLocation?.lng,
      marketConfirmOpen,
      portalOpen,
      realitySurfaceSession,
    ],
  );

  const applyDepartureHubSelection = useCallback(
    (chip: TripSituationRouterChip) => {
      if (!chip.departureHubId) {
        return;
      }
      const hub = getDepartureHubAirport(chip.departureHubId);
      const advanced = confirmDepartureHub({
        hub,
        homeLabel: chip.homeLabel?.trim() || "집",
        homeLat: liveLocation?.lat ?? null,
        homeLng: liveLocation?.lng ?? null,
      });
      if (!advanced) {
        return;
      }
      setDepartureHubPickerOpen(false);
      syncPortalComposeTurnToChat({
        graphId: ensureGlobeChatGraphId(),
        userText: chip.label,
        assistantText: composeTripFlowChatAssistantLine({
          headline: copy.globe.tripSituationRouter.departureConfirmed(hub.shortLabelKo),
          blueprint: advanced.operatorBlueprint,
          viewerLat: liveLocation?.lat ?? null,
          viewerLng: liveLocation?.lng ?? null,
        }),
      });
    },
    [
      confirmDepartureHub,
      liveLocation?.lat,
      liveLocation?.lng,
    ],
  );

  const onTripSituationSelect = useCallback(
    (chip: TripSituationRouterChip) => {
      if (chip.action === "destination") {
        onOperatorDestinationChoice({
          id: chip.id,
          label: chip.submitText?.trim() || chip.label.replace(/^[A-Z0-9]+\s*·\s*/u, "").trim(),
        });
        return;
      }
      if (chip.action === "destination_other") {
        const region =
          activeContextEvent?.place?.trim() ||
          activeContextEvent?.title?.replace(/\s*여행$/u, "").trim() ||
          "";
        ingestBarRef.current?.promptCityFill(
          region
            ? copy.globe.tripSituationRouter.destinationOtherHint(region)
            : copy.globe.tripSituationRouter.destinationOtherAsk,
        );
        return;
      }
      if (chip.action === "departure_other") {
        setDepartureHubPickerOpen(true);
        return;
      }
      if (chip.action === "departure_confirm" || chip.action === "departure_hub") {
        applyDepartureHubSelection(chip);
        return;
      }
      void ingestBarRef.current?.submitComposerText(
        chip.submitText?.trim() || chip.label,
      );
    },
    [
      activeContextEvent?.place,
      activeContextEvent?.title,
      applyDepartureHubSelection,
      onOperatorDestinationChoice,
    ],
  );

  const onGlobeIngressCompiled = useCallback(
    (input: {
      compiled: import("@/lib/globe-ingress/types").GlobeIngressCompileResult;
      eventId: string;
    }) => {
      setFromGlobeIngress(input);
      // Gap 2 — structure alone is not enough: enter domain Runtime / soft scout when safe.
      tryEnterDomainRuntimeAfterIngress(input);
      if (
        !activeContextEvent?.id ||
        activeContextEvent.id !== input.eventId ||
        !user?.id ||
        !isBridgeLinkedEventId(input.eventId)
      ) {
        return;
      }
      void seedBridgePlanningTruthFromIngress({
        event: activeContextEvent,
        compiled: input.compiled,
        updatedByUserId: user.id,
      });
    },
    [activeContextEvent, setFromGlobeIngress, user],
  );

  const onPriorityMainAction = useCallback(
    (payload: Extract<PriorityStripPayload, { kind: "main_action" }>) => {
      if (payload.actionKind === "show_qr" || payload.qrSrc) {
        setPriorityQrSrc(payload.qrSrc ?? payload.href);
        setPriorityQrTitle(payload.titleKo);
        setPriorityQrOpen(true);
        return;
      }
      if (payload.href) {
        if (payload.actionKind === "internal_route") {
          window.location.assign(payload.href);
          return;
        }
        window.open(payload.href, "_blank", "noopener,noreferrer");
        return;
      }
      if (payload.eventId) {
        setHubDetailOpen(true);
      }
    },
    [],
  );

  const bridgeMediaDeletable = useMemo(() => {
    const id = activeCluster?.eventId?.trim();
    return Boolean(id && isBridgeLinkedEventId(id));
  }, [activeCluster?.eventId]);

  const activeContextMediaReel = useMemo(() => {
    void mediaStoreRevision;
    const eventId = activeCluster?.eventId?.trim();
    if (!eventId || !activeContextEvent) {
      return [];
    }
    const volume = resolveExperienceVolumeForEvent(eventId);
    return projectContextMediaReel({
      event: activeContextEvent,
      volume,
      viewerUserId: user?.id,
    });
  }, [activeCluster?.eventId, activeContextEvent, mediaStoreRevision, user?.id]);

  const navigableContexts = useMemo(() => {
    void peerOptionsRevision;
    void mediaStoreRevision;
    if (!eventsHydrated) {
      return [];
    }
    return listGlobeContextNavigationOrder({
      timeFilter,
      peopleFilter,
    });
  }, [
    eventsHydrated,
    peerOptionsRevision,
    mediaStoreRevision,
    peopleFilter,
    timeFilter,
  ]);

  const contextHasMapMedia = useMemo(() => {
    if (!activeCluster?.eventId || !activeContextEvent) {
      return false;
    }
    const volume = resolveExperienceVolumeForEvent(activeCluster.eventId);
    return globeContextShouldMapReplayFirst({
      event: activeContextEvent,
      cluster: activeCluster,
      volume,
    });
  }, [activeCluster, activeContextEvent]);

  const mapMediaReplaySuppressed =
    Boolean(activeCluster?.eventId) &&
    mapMediaReplayDismissedEventId === activeCluster?.eventId;

  const workspaceOwnsMapMedia = Boolean(
    workspaceMapOwnerTick >= 0 &&
      (hubEventId?.trim() || activeCluster?.eventId?.trim()) &&
      readContextWorkspaceExpanded(
        (hubEventId?.trim() || activeCluster?.eventId?.trim())!,
      ),
  );

  const showMapVideoReplay = Boolean(
    activeCluster?.eventId &&
      !sheetOpen &&
      !stackClusters?.length &&
      contextMapTapPhaseAllowsMediaReplay(contextTapPhase) &&
      contextHasMapMedia &&
      !mapMediaReplaySuppressed &&
      !brainSurfaceVisible &&
      !contextAgentSurfacesActive &&
      !workspaceOwnsMapMedia,
  );

  /** Map stays clean while a context is focused — hub lives in the pin sheet. */
  const suppressMapHubRail = Boolean(
    hubEventId ||
      mapMediaFocusOpen ||
      brainSurfaceVisible ||
      contextAgentFocusLocked,
  );

  const dismissMapMediaReplay = useCallback(() => {
    const eventId = activeClusterRef.current?.eventId?.trim() ?? null;
    if (eventId) {
      setMapMediaReplayDismissedEventId(eventId);
    }
    setContextTapPhase("awaiting_replay");
    globeRef.current?.clearPinViewportBias();
  }, []);

  const launchBrainSurfaceProjection = useCallback(
    async (eventId: string) => {
      if (brainSurfaceLaunchInFlightRef.current === eventId) {
        return;
      }
      // Reuse in-memory batch when already projected for this context.
      if (brainSurfaceBatchRef.current?.eventId === eventId) {
        setBrainSurfaceLaunchToken((value) => value + 1);
        return;
      }
      brainSurfaceLaunchInFlightRef.current = eventId;
      try {
      const event =
        (activeContextEvent?.id === eventId ? activeContextEvent : null) ??
        findLifeEventCandidate(eventId) ??
        recoverGlobeContextEventFromPin(eventId);
      if (!event) {
        return;
      }
      await ensureTravelBrainMicroInventory({
        event,
        lat: activeClusterRef.current?.lat ?? null,
        lng: activeClusterRef.current?.lng ?? null,
      });
      const mediaGuides = await refreshContextMediaGuidesForEvent(
        findLifeEventCandidate(eventId) ?? event,
      );
      let manifest = readProjectionManifestForAnchor(eventId);
      if (!manifest) {
        return;
      }
      const missingGuides = mediaGuides.filter(
        (guide) =>
          !manifest?.nodes.some(
            (node) =>
              node.kind === "ghost" &&
              (node.sourceGuideNodeId?.trim() ?? "") === guide.guideNodeId,
          ),
      );
      if (missingGuides.length > 0) {
        manifest =
          patchMediaGuidesToProjection({
            event: findLifeEventCandidate(eventId) ?? event,
            guides: missingGuides,
            maxGuides: Math.min(missingGuides.length, 3),
          }) ?? manifest;
      }
      const batch = projectBrainSurfaceBatch({
        event: findLifeEventCandidate(eventId) ?? event,
        manifest,
        guides: mediaGuides,
      });
      if (!batch) {
        return;
      }
      setBrainSurfaceBatch(batch);
      setBrainSurfaceLaunchToken((value) => value + 1);
      spatialTraceTourSuppressedRef.current = true;
      spatialTraceTourSessionRef.current = null;
      stopSpatialTraceTour();
      setMapMediaReplayDismissedEventId(eventId);
      setContextTapPhase("awaiting_replay");
      setBrainSurfaceMode("spread");
      setBrainSurfaceFocusedFamily(null);
      setBrainSurfaceActiveCandidateId(null);
      setBrainSurfaceDetailMode(false);
      setBrainSurfaceShadowExpanded(false);
      setBrainSurfaceHighlightedInferredId(null);
      setBrainProjectionEventId(null);
      } finally {
        if (brainSurfaceLaunchInFlightRef.current === eventId) {
          brainSurfaceLaunchInFlightRef.current = null;
        }
      }
    },
    [activeContextEvent, stopSpatialTraceTour],
  );

  useEffect(() => {
    return subscribeGlobePlaceOntologyFocus((detail) => {
      const eventId = detail.contextEventId.trim();
      if (!eventId) {
        return;
      }
      void launchBrainSurfaceProjection(eventId).then(() => {
        setBrainSurfaceShadowExpanded(true);
        setBrainSurfaceMode("spread");
        setBrainSurfaceFocusedFamily(null);
        // Activity places → Action Graph + Reality Pipeline (lodging/eatery stay on reel).
        if (detail.kind === "activity") {
          const bias = resolvePlaceExploreBias({
            contextTitle: activeContextEvent?.title,
            contextPlace: activeContextEvent?.place,
            candidates: brainSurfaceBatchRef.current?.candidates,
          });
          openPlaceActionGraphWithPipeline({
            entity: entityFromBrainCandidate({
              placeId: detail.placeId,
              titleKo: detail.title,
              lat: detail.lat,
              lng: detail.lng,
              contextEventId: eventId,
              contextLabelKo:
                activeContextEvent?.place?.trim() ||
                activeContextEvent?.title?.trim() ||
                null,
            }),
            bias,
          });
          setPlaceActionGraphOpen(true);
          setBrainSurfaceActiveCandidateId(null);
          setBrainSurfaceDetailMode(false);
        }
      });
      if (Number.isFinite(detail.lat) && Number.isFinite(detail.lng)) {
        globeRef.current?.flyToPin(detail.lat, detail.lng, "street", {
          pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
        });
      }
    });
  }, [activeContextEvent?.place, activeContextEvent?.title, launchBrainSurfaceProjection]);

  useEffect(() => {
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = subscribeSessionGraph(() => {
      // Always refresh Diff → map markers, including while Context chat is open.
      // Clusters/overlays still skip for IME; freezing graphCommandRevision here
      // left "지도에 N곳을 펼쳤어요" with no pins until the panel closed.
      if (frame) {
        cancelAnimationFrame(frame);
      }
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      frame = requestAnimationFrame(() => {
        frame = 0;
        timer = setTimeout(() => {
          timer = null;
          setGraphCommandRevision((value) => value + 1);
        }, 48);
      });
    });
    return () => {
      unsub();
      if (frame) {
        cancelAnimationFrame(frame);
      }
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  // NL Action Plan wait_commit → Field queue handoff (one-shot).
  useEffect(() => {
    return subscribeActionPlanUi(() => {
      if (!consumeActionPlanFieldOpenRequest()) {
        return;
      }
      openFieldDashboardIngress({ tab: "queue" });
    });
  }, []);

  useEffect(() => {
    return subscribeOsakaDemoTheater(() => {
      setOsakaDemoTheater(readOsakaDemoTheaterState());
    });
  }, []);

  const startOsaka30sDemo = useCallback(async () => {
    if (osakaDemoInFlightRef.current) {
      return;
    }
    osakaDemoInFlightRef.current = true;
    setOsakaDemoRunning(true);
    setOsakaDemoProgress(null);
    setOsakaDemoApproving(false);
    try {
      const result = await runOsaka30sDemo({
        stepDelayMs: 520,
        onProgress: (next) => setOsakaDemoProgress(next),
        onFlyTo: (lat, lng) => {
          globeRef.current?.flyToPin(lat, lng, "neighborhood", {
            pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
          });
        },
      });
      // Pause at awaiting_approve — keep stage visible until approve/cancel.
      if (result.status === "awaiting_approve") {
        setOsakaDemoRunning(false);
        return;
      }
    } finally {
      osakaDemoInFlightRef.current = false;
      setOsakaDemoRunning(false);
    }
  }, []);

  const handleOsakaDemoApprove = useCallback(async () => {
    if (osakaDemoApproving) {
      return;
    }
    setOsakaDemoApproving(true);
    try {
      const result = await approveOsaka30sDemo();
      setOsakaDemoProgress(result);
    } finally {
      setOsakaDemoApproving(false);
      setOsakaDemoRunning(false);
    }
  }, [osakaDemoApproving]);

  const handleOsakaDemoCancel = useCallback(() => {
    const result = cancelOsaka30sDemo();
    setOsakaDemoProgress(result);
    setOsakaDemoRunning(false);
    setOsakaDemoApproving(false);
    window.setTimeout(() => {
      setOsakaDemoProgress(null);
      resetOsakaDemoTheaterState();
    }, 900);
  }, []);

  const handleOsakaDemoRewind = useCallback(() => {
    const result = rewindOsaka30sDemo();
    if (result) {
      setOsakaDemoProgress(result);
      setOsakaDemoRunning(false);
    }
  }, []);

  const handleOsakaDemoContinue = useCallback(async () => {
    if (osakaDemoInFlightRef.current) {
      return;
    }
    osakaDemoInFlightRef.current = true;
    setOsakaDemoRunning(true);
    try {
      const result = await continueOsaka30sDemo();
      if (result) {
        setOsakaDemoProgress(result);
      }
    } finally {
      osakaDemoInFlightRef.current = false;
      setOsakaDemoRunning(false);
    }
  }, []);
  useEffect(() => {
    return subscribeOsaka30sDemo(() => {
      void startOsaka30sDemo();
    });
  }, [startOsaka30sDemo]);

  useEffect(() => {
    return subscribePlaceExploreSession(() => {
      setPlaceActionGraphOpen(Boolean(readPlaceExploreSession()));
    });
  }, []);

  const openPlaceActionGraphForCandidate = useCallback(
    (candidate: BrainSurfaceProjectionCandidate) => {
      const bias = resolvePlaceExploreBias({
        contextTitle: activeContextEvent?.title,
        contextPlace: activeContextEvent?.place,
        candidates: brainSurfaceBatch?.candidates,
      });
      openPlaceActionGraphWithPipeline({
        entity: entityFromBrainCandidate({
          placeId: candidate.id,
          titleKo:
            candidate.placeLabel?.trim() ||
            candidate.label?.trim() ||
            candidate.previewTitle?.trim() ||
            "장소",
          lat: candidate.lat,
          lng: candidate.lng,
          contextEventId:
            candidate.eventId || activeContextEvent?.id || brainSurfaceBatch?.eventId,
          contextLabelKo:
            activeContextEvent?.place?.trim() ||
            activeContextEvent?.title?.trim() ||
            null,
          thumbnailUrl: candidate.markerThumbnailUrl,
          evidenceLineKo:
            candidate.relationMemoKo?.trim() ||
            candidate.previewBody?.trim() ||
            candidate.validityLabelKo?.trim() ||
            null,
        }),
        bias,
      });
      setPlaceActionGraphOpen(true);
    },
    [activeContextEvent, brainSurfaceBatch?.candidates, brainSurfaceBatch?.eventId],
  );

  const handlePlaceExploreProject = useCallback(
    (node: PlaceExploreGraphNode) => {
      const session = readPlaceExploreSession();
      if (!session) {
        return;
      }
      const batch = brainSurfaceBatchRef.current;
      const eventId =
        batch?.eventId?.trim() ||
        session.graph.entity.contextEventId?.trim() ||
        activeContextEvent?.id?.trim() ||
        "";
      if (!eventId) {
        toast.error("맥락을 먼저 열어 주세요");
        return;
      }
      const index = session.projectedCandidateIds.length;
      const projected = projectExploreChildToBrain({
        entity: session.graph.entity,
        node,
        eventId,
        index,
      });
      if (!projected) {
        return;
      }
      if (session.projectedCandidateIds.includes(projected.id)) {
        setBrainSurfaceActiveCandidateId(projected.id);
        globeRef.current?.flyToPin(projected.lat, projected.lng, "neighborhood", {
          pinViewportY: 0.58,
        });
        return;
      }
      appendProjectedCandidateId(projected.id);
      if (batch) {
        setBrainSurfaceBatch({
          ...batch,
          candidates: [...batch.candidates, projected],
        });
      } else {
        setBrainSurfaceBatch({
          eventId,
          candidates: [projected],
          createdAt: new Date().toISOString(),
          trigger: "brain_complete",
        });
      }
      setBrainSurfaceActiveCandidateId(projected.id);
      setBrainSurfaceShadowExpanded(true);
      syncPlaceExploreProjectionPipeline({
        entity: {
          ...session.graph.entity,
          contextEventId: session.graph.entity.contextEventId || eventId,
        },
        exploreLabelKo: node.labelKo,
      });
      toast.message(
        copy.globe.placeActionGraphExploreProjectedToast(node.labelKo),
      );
      globeRef.current?.flyToPin(projected.lat, projected.lng, "neighborhood", {
        pinViewportY: 0.58,
      });
    },
    [activeContextEvent?.id],
  );

  const handlePlaceExploreAction = useCallback(
    (node: PlaceExploreGraphNode) => {
      const session = readPlaceExploreSession();
      if (!session) {
        return;
      }
      const entity = session.graph.entity;
      const result = runPlaceExploreActionPipeline({
        entity,
        node,
        fallbackContextEventId:
          activeContextEvent?.id ?? brainSurfaceBatchRef.current?.eventId,
      });
      if (!result.ok) {
        if (result.reason === "no_context") {
          toast.error("맥락을 먼저 열어 주세요");
        }
        return;
      }
      if ("side" in result && result.side === "directions") {
        window.open(
          `https://www.google.com/maps/dir/?api=1&destination=${entity.lat},${entity.lng}`,
          "_blank",
          "noopener,noreferrer",
        );
        toast.message(copy.globe.placeActionGraphDirectionsToast);
        return;
      }
      if ("side" in result && result.side === "schedule") {
        toast.message(copy.globe.placeActionGraphScheduleToast(entity.titleKo));
        return;
      }
      if (!("operation" in result) || !result.operation) {
        return;
      }
      toast.message(
        result.toastKind === "ask_ai"
          ? copy.globe.placeActionGraphAskAiToast
          : copy.globe.intelligentPinAddInboxToast(entity.titleKo),
      );
      openFieldDashboardIngress({ tab: "queue", primaryEventId: result.eventId });
    },
    [activeContextEvent?.id],
  );

  const handleBrainSurfaceMarkerPress = useCallback(
    (candidateId: string) => {
      const candidate = brainSurfaceCandidatesById.get(candidateId);
      if (!candidate) {
        return;
      }

      if (shouldOpenPlaceActionGraph(candidate)) {
        if (candidate.anchorKind === "inferred_place") {
          setBrainSurfaceHighlightedInferredId(candidateId);
        } else {
          setBrainSurfaceHighlightedInferredId(null);
        }
        setBrainSurfaceActiveCandidateId(candidateId);
        setBrainSurfaceDetailMode(false);
        setBrainSurfaceMode("spread");
        setBrainSurfaceFocusedFamily(null);
        openPlaceActionGraphForCandidate(candidate);
        globeRef.current?.flyToPin(candidate.lat, candidate.lng, "street", {
          pinViewportY: BRAIN_SURFACE_DOCK_PIN_VIEWPORT_Y,
        });
        return;
      }

      if (brainSurfaceShadowExpanded && candidate.anchorKind === "inferred_place") {
        setBrainSurfaceHighlightedInferredId(candidateId);
        setBrainSurfaceActiveCandidateId(candidateId);
        setBrainSurfaceDetailMode(true);
        globeRef.current?.flyToPin(candidate.lat, candidate.lng, "street", {
          pinViewportY: BRAIN_SURFACE_DOCK_PIN_VIEWPORT_Y,
        });
        return;
      }

      if (brainSurfaceActiveCandidateId === candidateId) {
        setBrainSurfaceDetailMode(true);
        return;
      }

      setBrainSurfaceMode("spread");
      setBrainSurfaceFocusedFamily(null);
      setBrainSurfaceShadowExpanded(false);
      setBrainSurfaceHighlightedInferredId(null);
      setBrainSurfaceActiveCandidateId(candidateId);
      setBrainSurfaceDetailMode(false);
      clearPlaceExploreSession();
      setPlaceActionGraphOpen(false);
      globeRef.current?.flyToPin(candidate.lat, candidate.lng, "neighborhood", {
        pinViewportY: 0.58,
      });
    },
    [
      brainSurfaceActiveCandidateId,
      brainSurfaceCandidatesById,
      brainSurfaceShadowExpanded,
      openPlaceActionGraphForCandidate,
    ],
  );

  const handleBrainSurfacePrimaryAction = useCallback(() => {
    if (!activeContextEvent || !activeBrainSurfaceCandidate) {
      return;
    }
    if (activeBrainSurfaceNode) {
      brainSurfaceAction(
        resolveProjectionNodeTap({
          node: activeBrainSurfaceNode,
          event: activeContextEvent,
        }),
      );
      return;
    }
    if (activeBrainSurfaceCandidate.openUrl) {
      window.open(activeBrainSurfaceCandidate.openUrl, "_blank", "noopener,noreferrer");
      setBrainSurfaceActiveCandidateId(null);
      setBrainSurfaceDetailMode(false);
      return;
    }
    if (activeBrainSurfaceCandidate.mapsUrl) {
      window.open(activeBrainSurfaceCandidate.mapsUrl, "_blank", "noopener,noreferrer");
      setBrainSurfaceActiveCandidateId(null);
      setBrainSurfaceDetailMode(false);
    }
  }, [
    activeBrainSurfaceCandidate,
    activeBrainSurfaceNode,
    activeContextEvent,
    brainSurfaceAction,
  ]);

  const handleBrainSurfaceMemoCommit = useCallback(async () => {
    if (!brainSurfaceBatch || !activeBrainSurfaceCandidate?.memoCommitDraft) {
      return;
    }
    setBrainSurfaceCommitPending(true);
    try {
      const saved = await commitBrainSurfaceMemoPin({
        anchorEventId: brainSurfaceBatch.eventId,
        draft: activeBrainSurfaceCandidate.memoCommitDraft,
      });
      toast.success(`${saved.place?.trim() || saved.title.trim()}에 메모 남겼어요`);
      setBrainSurfaceActiveCandidateId(null);
      setBrainSurfaceDetailMode(false);
    } catch (error) {
      console.error(error);
      toast.error("메모를 지도에 남기지 못했어요");
    } finally {
      setBrainSurfaceCommitPending(false);
    }
  }, [activeBrainSurfaceCandidate?.memoCommitDraft, brainSurfaceBatch]);

  const handleExpandActiveVideoInferredMap = useCallback(() => {
    if (!activeContextEvent || !activeBrainSurfaceCandidate || !brainSurfaceBatch) {
      return;
    }

    const clusterId = activeBrainSurfaceCandidate.clusterId?.trim() ?? null;
    const guideId =
      activeBrainSurfaceCandidate.sourceGuideNodeId?.trim() ??
      activeBrainSurfaceCandidate.parentGuideNodeId?.trim() ??
      null;
    const inferredInCluster = clusterId
      ? filterVisibleBrainSurfaceCandidates(
          filterBrainSurfaceShadowExpandPins(brainSurfaceBatch.candidates, {
            clusterId,
            guideId,
          }),
        )
      : [];

    if (inferredInCluster.length === 0) {
      if (activeBrainSurfaceCandidate.sourceGuideNodeId) {
        const guide = queryMediaGuideByGuideNodeId(
          activeBrainSurfaceCandidate.sourceGuideNodeId,
        );
        if (guide) {
          const ok = expandMediaGuideOnMap({ event: activeContextEvent, guide });
          if (!ok) {
            toast.error(copy.common.tryAgain);
          }
        }
      }
      return;
    }

    spatialTraceTourSuppressedRef.current = true;
    spatialTraceTourSessionRef.current = null;
    stopSpatialTraceTour();

    setBrainSurfaceShadowExpanded(true);
    setBrainSurfaceDetailMode(false);
    setBrainSurfaceMode("spread");
    setBrainSurfaceFocusedFamily(null);
    setBrainSurfaceHighlightedInferredId(inferredInCluster[0]?.id ?? null);

    const bounds = computeLodgingDiscoveryBounds({
      user: null,
      lodging: inferredInCluster.map((row) => ({ lat: row.lat, lng: row.lng })),
      radiusM: 1200,
    });
    if (bounds) {
      globeRef.current?.flyToDiscoveryBounds({
        centerLat: bounds.centerLat,
        centerLng: bounds.centerLng,
        altitude: bounds.altitude,
        pinViewportY: 0.52,
      });
    } else {
      const first = inferredInCluster[0];
      if (first && Number.isFinite(first.lat) && Number.isFinite(first.lng)) {
        globeRef.current?.flyToPin(first.lat, first.lng, "street", {
          pinViewportY: 0.52,
        });
      }
    }
  }, [
    activeBrainSurfaceCandidate,
    activeCluster?.lat,
    activeCluster?.lng,
    activeContextEvent,
    brainSurfaceBatch,
    stopSpatialTraceTour,
  ]);

  useEffect(() => {
    if (!mapVideoPlaying || spatialTraceTourStops.length === 0 || brainSurfaceVisible) {
      return;
    }
    const sessionKey = `map:${activeCluster?.eventId ?? ""}:${spatialTraceTourStops
      .map((stop) => stop.id)
      .join("|")}`;
    if (spatialTraceTourSessionRef.current === sessionKey) {
      return;
    }
    spatialTraceTourSessionRef.current = sessionKey;
    startSpatialTraceTour();
  }, [activeCluster?.eventId, brainSurfaceVisible, mapVideoPlaying, spatialTraceTourStops, startSpatialTraceTour]);

  useEffect(() => {
    if (!spatialTraceTourAdvancePaused || !spatialTraceTourRunning) {
      return;
    }
    stopSpatialTraceTour();
  }, [
    spatialTraceTourAdvancePaused,
    spatialTraceTourRunning,
    stopSpatialTraceTour,
  ]);

  useEffect(() => {
    if (!spatialTraceTourRunning) {
      return;
    }
    if (!mapVideoPlaying && !brainSurfaceVisible) {
      stopSpatialTraceTour();
    }
  }, [brainSurfaceVisible, mapVideoPlaying, spatialTraceTourRunning, stopSpatialTraceTour]);

  const handleBrainSurfaceConnect = useCallback(() => {
    if (!activeContextEvent || !activeBrainSurfaceNode || activeBrainSurfaceNode.kind !== "ghost") {
      return;
    }
    const promoted = commitKnowledgeToProjection({
      anchorEventId: activeContextEvent.id,
      ghostNodeId: activeBrainSurfaceNode.id,
      pillId: activeBrainSurfacePill?.id ?? null,
    });
    if (!promoted) {
      toast.error("이 연결을 남기지 못했어요");
      return;
    }
    toast.success(copy.globe.contextBrainConnected(activeBrainSurfaceNode.label));
    const nextBatch = projectBrainSurfaceBatch({
      event: activeContextEvent,
      manifest: promoted,
      guides: activeContextMediaGuides,
    });
    setBrainSurfaceBatch(nextBatch);
    setBrainSurfaceMode("spread");
    setBrainSurfaceFocusedFamily(null);
    setBrainSurfaceActiveCandidateId(null);
    setBrainSurfaceDetailMode(false);
  }, [
    activeBrainSurfaceNode,
    activeBrainSurfacePill?.id,
    activeContextEvent,
    activeContextMediaGuides,
  ]);

  useEffect(() => {
    if (
      !brainSurfaceVisible ||
      !brainSurfaceBatch ||
      !activeContextEvent ||
      !activeContextProjectionManifest ||
      activeContextMediaGuides.length === 0
    ) {
      return;
    }
    if (brainSurfaceBatch.eventId !== activeContextEvent.id) {
      return;
    }

    const nextBatch = projectBrainSurfaceBatch({
      event: activeContextEvent,
      manifest: activeContextProjectionManifest,
      guides: activeContextMediaGuides,
    });
    if (!nextBatch) {
      return;
    }

    const videoSignature = (batch: BrainSurfaceProjectionBatch) =>
      batch.candidates
        .filter((candidate) => candidate.anchorKind === "video_root")
        .map(
          (candidate) =>
            `${candidate.sourceGuideNodeId}:${candidate.embedUrl ?? ""}`,
        )
        .join("|");

    if (
      videoSignature(brainSurfaceBatch) === videoSignature(nextBatch) &&
      brainSurfaceBatch.candidates.length === nextBatch.candidates.length
    ) {
      return;
    }

    const prevActiveId = brainSurfaceActiveCandidateIdRef.current;
    const prevActive = prevActiveId
      ? brainSurfaceBatch.candidates.find((candidate) => candidate.id === prevActiveId)
      : null;

    setBrainSurfaceBatch(nextBatch);

    if (prevActive) {
      const nextActive =
        nextBatch.candidates.find(
          (candidate) =>
            candidate.sourceGuideNodeId === prevActive.sourceGuideNodeId &&
            candidate.anchorKind === prevActive.anchorKind,
        ) ?? null;
      if (nextActive && nextActive.id !== prevActiveId) {
        setBrainSurfaceActiveCandidateId(nextActive.id);
      }
    }
  }, [
    activeContextEvent,
    activeContextMediaGuides,
    activeContextProjectionManifest,
    brainSurfaceBatch,
    brainSurfaceVisible,
  ]);

  useEffect(() => {
    if (
      !activeContextEvent ||
      !activeContextProjectionManifest ||
      layerMode !== "personal" ||
      brainProjectionEventId ||
      contextAgentSurfacesActive ||
      contextConditionPanelOpen ||
      !shouldAutoLaunchBrainSurface() ||
      sheetOpen ||
      hubDetailOpen ||
      mapMediaFocusOpen ||
      confirmOpen ||
      portalOpen ||
      marketConfirmOpen
    ) {
      return;
    }
    const travelUi = activeContextProjectionManifest.travelBrain?.ui ?? null;
    if (travelUi && travelUi.stage !== "ready") {
      return;
    }
    const launchKey = activeContextEvent.id;
    if (brainSurfaceBatch?.eventId === activeContextEvent.id) {
      autoBrainSurfaceLaunchKeyRef.current = launchKey;
      return;
    }
    if (autoBrainSurfaceLaunchKeyRef.current === launchKey) {
      return;
    }
    autoBrainSurfaceLaunchKeyRef.current = launchKey;
    launchBrainSurfaceProjection(activeContextEvent.id);
  }, [
    activeContextEvent,
    activeContextProjectionManifest,
    contextAgentSurfacesActive,
    contextConditionPanelOpen,
    brainProjectionEventId,
    brainSurfaceBatch?.eventId,
    confirmOpen,
    hubDetailOpen,
    layerMode,
    launchBrainSurfaceProjection,
    mapMediaFocusOpen,
    marketConfirmOpen,
    portalOpen,
    sheetOpen,
  ]);

  useEffect(() => {
    if (brainSurfaceVisible) {
      return;
    }
    setBrainSurfaceMode("spread");
    setBrainSurfaceFocusedFamily(null);
    setBrainSurfaceActiveCandidateId(null);
    setBrainSurfaceDetailMode(false);
    setBrainSurfaceShadowExpanded(false);
    setBrainSurfaceHighlightedInferredId(null);
  }, [brainSurfaceVisible]);

  useEffect(() => {
    const eventId = activeCluster?.eventId?.trim() ?? null;
    if (!brainSurfaceBatch || !eventId || brainSurfaceBatch.eventId === eventId) {
      return;
    }
    setBrainSurfaceBatch(null);
    setBrainSurfaceMode("spread");
    setBrainSurfaceFocusedFamily(null);
    setBrainSurfaceActiveCandidateId(null);
    setBrainSurfaceDetailMode(false);
    setBrainSurfaceShadowExpanded(false);
    setBrainSurfaceHighlightedInferredId(null);
  }, [activeCluster?.eventId, brainSurfaceBatch]);

  useEffect(() => {
    const refresh = () => setPeerOptionsRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, refresh);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, refresh);
    };
  }, []);

  useEffect(() => {
    const bump = () => {
      if (contextConditionPanelOpenRef.current || isGlobeComposeInputFocused()) {
        return;
      }
      setMediaStoreRevision((value) => value + 1);
    };
    void hydrateMediaContextStore().then(bump);
    window.addEventListener(MEDIA_SPACETIME_UPDATED, bump);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => {
      window.removeEventListener(MEDIA_SPACETIME_UPDATED, bump);
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
    };
  }, []);

  useEffect(() => {
    return subscribeIdentityVaultSettingsOpen(() => {
      setIdentityVaultFocus(true);
      setIdentityProfileOpen(true);
    });
  }, []);

  useEffect(() => {
    return subscribeOpenPaymentVaultSettings(() => {
      setPaymentVaultFocus(true);
      setIdentityProfileOpen(true);
    });
  }, []);

  useEffect(() => {
    const hubPg = searchParams.get("hub_pg");
    if (hubPg !== "success") {
      return;
    }
    const orderId = searchParams.get("order_id")?.trim();
    const provider = searchParams.get("provider")?.trim() ?? "pg";
    const pending = readHubPgPendingFinalize();
    if (!pending || !orderId) {
      return;
    }
    void (async () => {
      const bundle = await readIdentityVaultBundleClient();
      const result = await finalizeLodgingHubCheckoutFromPgReturn({
        pending,
        identityBundle: bundle,
        externalRef: `${provider}:${orderId}`,
        handoffHref: "",
      });
      clearHubPgPendingFinalize();
      if (result.ok) {
        toast.success(copy.hubCheckout.pgReturnDone);
      } else {
        toast.message(copy.hubCheckout.payFailed);
      }
    })();
  }, [searchParams]);

  useEffect(() => {
    const hubLiteApi = searchParams.get("hub_liteapi");
    if (hubLiteApi !== "return") {
      return;
    }
    const sessionId = searchParams.get("session_id")?.trim();
    const pending = readLiteApiPendingCheckout();
    if (!pending) {
      return;
    }
    if (sessionId && pending.sessionId !== sessionId) {
      return;
    }
    void (async () => {
      const bundle = await readIdentityVaultBundleClient();
      const guest = buildLiteApiGuestPayload(bundle);
      if (!guest) {
        toast.error(copy.globe.lodgingRoomCardIdentityMissing);
        clearLiteApiPendingCheckout();
        return;
      }
      const bookResponse = await fetch("/api/hub/checkout/liteapi/book", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prebookId: pending.prebookId,
          transactionId: pending.transactionId,
          guest,
        }),
      });
      if (!bookResponse.ok) {
        toast.error(copy.hubCheckout.liteapiBookFailed);
        clearLiteApiPendingCheckout();
        return;
      }
      const booked = (await bookResponse.json()) as {
        bookingId?: string;
        hotelConfirmationCode?: string | null;
      };
      const bookingId = booked.bookingId?.trim();
      if (!bookingId) {
        toast.error(copy.hubCheckout.liteapiBookFailed);
        clearLiteApiPendingCheckout();
        return;
      }
      const result = await finalizeLodgingHubCheckoutFromLiteApiReturn({
        contextEventId: pending.contextEventId,
        resourceId: pending.resourceId,
        identityBundle: bundle,
        prebookId: pending.prebookId,
        transactionId: pending.transactionId,
        bookingId,
        hotelConfirmationCode: booked.hotelConfirmationCode ?? null,
      });
      clearLiteApiPendingCheckout();
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/");
      }
      if (result.ok) {
        toast.success(
          booked.hotelConfirmationCode
            ? copy.hubCheckout.liteapiReturnConfirm(booked.hotelConfirmationCode)
            : copy.hubCheckout.liteapiReturnDone,
        );
      } else {
        toast.message(copy.hubCheckout.liteapiBookFailed);
      }
    })();
  }, [searchParams]);

  useEffect(() => {
    for (const invite of pendingBridgeInvites) {
      const eventId = invite.state.bridge.eventId;
      if (seenBridgeToastRef.current.has(eventId)) {
        continue;
      }
      seenBridgeToastRef.current.add(eventId);
      const host = invite.state.participants.find((row) => row.role === "host");
      const hostName =
        host?.displayName?.trim() || copy.globe.bridgeInviteHostFallback;
      toast.message(
        copy.globe.bridgeInviteToast(hostName, invite.state.bridge.title),
        {
          action: {
            label: "수신함",
            onClick: () => setGlobeInboxOpen(true),
          },
        },
      );
    }
  }, [pendingBridgeInvites]);

  useEffect(() => {
    for (const notification of globeNotifications) {
      if (notification.kind !== "market_align") {
        continue;
      }
      const handshakeId = notification.marketAlignOffer?.handshakeId?.trim();
      if (!handshakeId || seenMarketAlignToastRef.current.has(handshakeId)) {
        continue;
      }
      seenMarketAlignToastRef.current.add(handshakeId);
      toast.message(copy.globe.marketAlignInboxToast(notification.title), {
        duration: 4200,
        action: {
          label: copy.globe.marketAlignInboxOpenCta,
          onClick: () => setGlobeInboxOpen(true),
        },
      });
    }
  }, [globeNotifications]);

  useEffect(() => {
    if (globeInboxCount <= seenInboxCountRef.current) {
      seenInboxCountRef.current = globeInboxCount;
      return;
    }
    const delta = globeInboxCount - seenInboxCountRef.current;
    seenInboxCountRef.current = globeInboxCount;
    if (delta > 0 && pendingBridgeInvites.length === 0) {
      toast.message(copy.globe.inboxToastNew(delta), {
        action: {
          label: "수신함",
          onClick: () => setGlobeInboxOpen(true),
        },
      });
    }
  }, [globeInboxCount, pendingBridgeInvites.length]);

  useEffect(() => {
    const onShareRequest = (event: Event) => {
      const detail = (event as CustomEvent<GlobeContextShareRequestDetail>).detail;
      const eventId = detail?.eventId?.trim();
      if (!eventId) {
        return;
      }
      setShareEventId(eventId);
      setShareSheetOpen(true);
    };
    window.addEventListener(GLOBE_CONTEXT_SHARE_REQUEST, onShareRequest);
    return () => window.removeEventListener(GLOBE_CONTEXT_SHARE_REQUEST, onShareRequest);
  }, []);

  const onContextGroupPress = useCallback(
    (clusters: readonly PinCluster[]) => {
      markPinPress();
      applyNearbyContexts(clusters, clusters[0] ?? null);
    },
    [applyNearbyContexts, markPinPress],
  );

  const onPinPress = useCallback(
    (cluster: PinCluster) => {
      markPinPress();
      if (readGlobeContextAgentSession().phase === "arming") {
        if (
          !isExternalPinCluster(cluster) &&
          cluster.variant !== "bridge_ghost" &&
          cluster.eventId?.trim()
        ) {
          bindContextAgentToEventIdRef.current(cluster.eventId.trim());
        }
        return;
      }
      if (isExternalPinCluster(cluster)) {
        globeRef.current?.flyToPin(cluster.lat, cluster.lng, "neighborhood");
        const author = cluster.authorDisplayName?.trim();
        const headline = author
          ? `${author} · ${cluster.title}`
          : cluster.title;
        toast.message(headline, {
          description: cluster.recallLine ?? copy.globe.externalTraceReadOnly,
        });
        return;
      }
      if (cluster.variant === "bridge_ghost") {
        const invite = pendingBridgeInvites.find(
          (row) => row.state.bridge.eventId === cluster.eventId,
        );
        if (invite) {
          globeRef.current?.flyToPin(cluster.lat, cluster.lng, "neighborhood");
          setBridgeGhostInvite(invite);
          setBridgeGhostCluster(cluster);
          setBridgeGhostOpen(true);
        }
        return;
      }
      if (activeClusterRef.current?.pinId === cluster.pinId) {
        handleSameContextRetap();
        return;
      }
      openContextCluster(cluster, { mapTap: true });
    },
    [handleSameContextRetap, markPinPress, openContextCluster, pendingBridgeInvites],
  );

  const registerMemoryRecallComposeHandlers = useCallback(
    (handlers: { onFocus: () => void; onBlur: () => void }) => {
      memoryRecallComposeRef.current = {
        onFocus: () => {
          setPortalPeekOpen(false);
          handlers.onFocus();
        },
        onBlur: handlers.onBlur,
      };
    },
    [],
  );

  const togglePortalPeek = useCallback(() => {
    setPortalPeekOpen((open) => {
      const next = !open;
      if (next) {
        setGlobeMemoryDismissToken((token) => token + 1);
      }
      return next;
    });
  }, []);

  const onGlobePress = useCallback(
    (coords: { lat: number; lng: number }) => {
      if (readGlobeContextAgentSession().phase === "arming") {
        const nearby = resolveNearbyAt(coords.lat, coords.lng);
        applyNearbyContexts(nearby);
        return;
      }
      const lensEventId =
        contextAgentBoundEventId?.trim() ??
        activeClusterRef.current?.eventId?.trim();
      if (
        contextConditionPanelOpen &&
        lensEventId &&
        readDiscoveryLensSession(lensEventId)?.lenses.length
      ) {
        if (
          handleDiscoveryLensGlobePress({
            contextEventId: lensEventId,
            lat: coords.lat,
            lng: coords.lng,
          })
        ) {
          return;
        }
      }
      setGlobeMemoryDismissToken((token) => token + 1);
      setPortalPeekOpen(false);
      if (pinDragActiveRef.current) {
        return;
      }
      if (Date.now() - lastPinPressAtRef.current < GLOBE_PIN_PRESS_SUPPRESS_MS) {
        return;
      }
      if (
        brainSurfaceVisible &&
        (brainSurfaceMode === "focused" ||
          brainSurfaceActiveCandidateId != null ||
          brainSurfaceDetailMode)
      ) {
        dismissBrainSurfacePreview();
        setBrainSurfaceMode("spread");
        setBrainSurfaceFocusedFamily(null);
        globeRef.current?.clearPinViewportBias();
        return;
      }
      const nearby = resolveNearbyAt(coords.lat, coords.lng);
      if (nearby.length === 0) {
        clearActiveContext();
        return;
      }
      applyNearbyContexts(nearby);
    },
    [
      applyNearbyContexts,
      brainSurfaceActiveCandidateId,
      brainSurfaceDetailMode,
      brainSurfaceMode,
      brainSurfaceVisible,
      clearActiveContext,
      dismissBrainSurfacePreview,
      resolveNearbyAt,
      contextConditionPanelOpen,
      contextAgentBoundEventId,
    ],
  );

  const onSheetOpenChange = useCallback(
    (open: boolean) => {
      setSheetOpen(open);
      if (!open) {
        setPinSheetInitialPage("media");
        clearActiveContext();
      }
    },
    [clearActiveContext],
  );

  const openMapMediaBridge = useCallback(() => {
    if (!shouldOpenGlobeBridgeSheet()) {
      return;
    }
    markPinPress();
    const eventId = activeClusterRef.current?.eventId?.trim();
    if (!eventId) {
      setSheetOpen(true);
      return;
    }
    setContextTapPhase("awaiting_replay");
    globeRef.current?.clearPinViewportBias();
    setPinSheetInitialPage(
      resolvePinOpenInitialPage({
        eventId,
        viewerUserId: user?.id,
        fromMapMediaTap: true,
      }),
    );
    setSheetOpen(true);
  }, [markPinPress, user?.id]);

  useEffect(() => {
    openMapMediaBridgeRef.current = openMapMediaBridge;
  }, [openMapMediaBridge]);

  const focusContextByEventId = useCallback(
    async (
      eventId: string,
      options?: {
        openSheet?: boolean;
        mapTap?: boolean;
        sheetPage?: PinOpenInitialPage;
      },
    ) => {
      const key = eventId.trim();
      if (!key) {
        return null;
      }
      if (readGlobeContextAgentSession().phase === "arming") {
        bindContextAgentToEventIdRef.current(key);
        const result = await focusGlobeContextOnMap(key);
        return result?.cluster ?? null;
      }
      const result = await focusGlobeContextOnMap(eventId);
      if (!result) {
        toast.error("맥락을 찾지 못했어요");
        return null;
      }
      openContextCluster(result.cluster, {
        openSheet: options?.openSheet,
        mapTap: options?.mapTap,
        sheetPage: options?.sheetPage,
      });
      return result.cluster;
    },
    [openContextCluster],
  );
  const focusContextByEventIdRef = useRef(focusContextByEventId);

  const anchorContextForAgentBind = useCallback(async (eventId: string) => {
    const key = eventId.trim();
    if (!key) {
      return null;
    }
    const result = await focusGlobeContextOnMap(key);
    if (!result?.cluster) {
      toast.error("맥락을 찾지 못했어요");
      return null;
    }
    const cluster = result.cluster;
    snapGlobeToContextAgentAnchor(globeRef, cluster);
    setStackClusters(null);
    setActiveCluster(cluster);
    setSheetOpen(false);
    setHubDetailOpen(false);
    setMapMediaReplayDismissedEventId(key);
    setContextTapPhase("awaiting_replay");

    const event =
      findLifeEventCandidate(key) ?? recoverGlobeContextEventFromPin(key);
    if (event) {
      writeGlobeResumeSession({
        eventId: key,
        title: cluster.title?.trim() || event.title,
        placeLabel: cluster.placeLabel?.trim() || event.place,
        kind: "context",
      });
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("recallEvent") !== key) {
      params.set("recallEvent", key);
      const next = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", next);
    }
    return cluster;
  }, []);

  const bindContextAgentToEventId = useCallback(
    async (eventId: string) => {
      const key = eventId.trim();
      if (!key) {
        return;
      }
      dismissedAssistantRecallRef.current = null;
      dismissCompetingGlobeSurfaces();
      bindGlobeContextAgent(key);
      setStackClusters(null);
      enterContextSoloStage(key);
      const previewCluster =
        resolveGlobeContextPinCluster(key) ??
        resolveGlobeContextCardPinCluster(key) ??
        clustersRef.current.find((cluster) => cluster.eventId?.trim() === key) ??
        null;
      // Any context must be connectable — if the tapped pin has no backing
      // event/pin (GPS dwell · media cluster · pruned), rebuild one from the
      // cluster so anchoring never hard-fails with "맥락을 찾지 못했어요".
      let event =
        findLifeEventCandidate(key) ?? recoverGlobeContextEventFromPin(key);
      if (!event && previewCluster) {
        event = materializeGlobeContextAnchorEventFromCluster(previewCluster);
      }
      if (previewCluster) {
        snapGlobeToContextAgentAnchor(globeRef, previewCluster);
      }
      // Paint the assistant first — geocode / URL / resume must not block open.
      openGlobeContextConditionPanel(key);
      if (event && isLodgingInventoryMisanchored(event)) {
        clearContextConditionLastBatch(key);
      }
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      await anchorContextForAgentBind(key);
    },
    [anchorContextForAgentBind, dismissCompetingGlobeSurfaces],
  );

  useEffect(() => {
    bindContextAgentToEventIdRef.current = (eventId) => {
      void bindContextAgentToEventId(eventId);
    };
  }, [bindContextAgentToEventId]);

  useEffect(() => {
    focusContextByEventIdRef.current = focusContextByEventId;
  }, [focusContextByEventId]);

  useEffect(() => {
    return subscribeGlobeContextHubOpen((detail) => {
      const eventId = detail.contextEventId.trim();
      if (!shouldOpenGlobeHubDetail()) {
        setSheetOpen(false);
        setHubDetailOpen(false);
        void focusContextByEventIdRef.current(eventId, {
          openSheet: false,
          mapTap: false,
        });
        return;
      }
      setSheetOpen(false);
      setHubDetailOpen(true);
      if (activeClusterRef.current?.eventId?.trim() !== eventId) {
        focusContextByEventIdRef.current(eventId, { openSheet: false });
      }
    });
  }, []);

  useEffect(() => {
    return subscribeGlobeAskBridgeFocus((detail) => {
      const mode = detail.mode ?? "bridge";
      if (mode === "map" || !shouldOpenGlobeBridgeSheet()) {
        void focusContextByEventIdRef.current(detail.eventId, {
          openSheet: false,
          mapTap: mode === "map",
        });
        return;
      }
      if (mode === "photos") {
        void focusContextByEventIdRef.current(detail.eventId, {
          openSheet: true,
          mapTap: false,
          sheetPage: "media",
        });
        return;
      }
      void focusContextByEventIdRef.current(detail.eventId, {
        openSheet: true,
        mapTap: false,
        sheetPage: "context",
      });
    });
  }, []);

  useEffect(() => {
    let clearTimer: number | null = null;
    const unsub = subscribeRealityCommitPulse((detail) => {
      const eventId = detail.contextEventId.trim();
      if (!eventId) {
        return;
      }
      void focusContextByEventIdRef.current(eventId, {
        openSheet: false,
        mapTap: true,
      });
      setRealityCommitPulseEventId(eventId);
      if (clearTimer != null) {
        window.clearTimeout(clearTimer);
      }
      clearTimer = window.setTimeout(() => {
        setRealityCommitPulseEventId((current) =>
          current === eventId ? null : current,
        );
        clearTimer = null;
      }, 2000);
    });
    return () => {
      unsub();
      if (clearTimer != null) {
        window.clearTimeout(clearTimer);
      }
    };
  }, []);

  useEffect(() => {
    return subscribeGlobeBrainProjectionRequest((detail) => {
      const eventId = detail.anchorEventId.trim();
      if (!eventId) {
        return;
      }
      setSheetOpen(false);
      setHubDetailOpen(false);
      setContextTapPhase("awaiting_replay");
      setBrainProjectionEventId(eventId);
      if (activeClusterRef.current?.eventId?.trim() === eventId) {
        return;
      }
      void focusContextByEventIdRef.current(eventId, {
        openSheet: false,
        mapTap: true,
      });
    });
  }, []);

  useEffect(() => {
    return subscribeGlobeBrainContextRunRequest((detail) => {
      if (detail.ghostAxisId !== "eatery" && detail.ghostAxisId !== "lodging") {
        return;
      }
      const anchorEventId = detail.anchorEventId.trim();
      if (!anchorEventId) {
        return;
      }
      setBrainProjectionEventId(null);
      setSheetOpen(false);
      setHubDetailOpen(false);
      void focusContextByEventIdRef.current(anchorEventId, {
        openSheet: false,
        mapTap: true,
      }).then((cluster) => {
        const event =
          findLifeEventCandidate(anchorEventId) ?? recoverGlobeContextEventFromPin(anchorEventId);
        const fallbackQuery =
          detail.searchQuery?.trim() ||
          event?.place?.trim() ||
          event?.title?.trim() ||
          (detail.ghostAxisId === "lodging" ? "숙소 찾기" : "맛집 찾기");
        if (detail.ghostAxisId === "lodging") {
          toast.message(copy.globe.lodgingDiscoveryLoading);
          void runGlobeLodgingDiscovery({
            message: fallbackQuery,
            contextEventId: anchorEventId,
            lat: cluster?.lat ?? liveLocation?.lat ?? null,
            lng: cluster?.lng ?? liveLocation?.lng ?? null,
            searching: true,
          }).then((outcome) => {
            if (!outcome) {
              toast.error(copy.globe.lodgingDiscoveryEmpty);
            }
          });
          return;
        }
        toast.message(copy.globe.eateryDiscoveryLoading);
        void runGlobeEateryDiscovery({
          message: fallbackQuery,
          contextEventId: anchorEventId,
          pinLat: cluster?.lat ?? null,
          pinLng: cluster?.lng ?? null,
          lat: liveLocation?.lat ?? null,
          lng: liveLocation?.lng ?? null,
          searching: true,
        }).then((outcome) => {
          if (!outcome) {
            toast.error(copy.globe.eateryDiscoveryEmpty);
          }
        });
      });
    });
  }, [liveLocation?.lat, liveLocation?.lng]);

  useEffect(() => {
    if (!brainProjectionEventId) {
      return;
    }
    if (sheetOpen || hubDetailOpen || mapMediaFocusOpen) {
      setBrainProjectionEventId(null);
    }
  }, [brainProjectionEventId, hubDetailOpen, mapMediaFocusOpen, sheetOpen]);

  useEffect(() => {
    const activeEventId = activeCluster?.eventId?.trim() || null;
    if (brainProjectionEventId && activeEventId !== brainProjectionEventId) {
      setBrainProjectionEventId(null);
    }
  }, [activeCluster?.eventId, brainProjectionEventId]);

  useGlobeTripArrival(
    {
      onArrival: ({ lat, lng, recallEventId, recallLine, placeLabel }) => {
        globeRef.current?.flyToPin(lat, lng, "neighborhood");
        const nearby = resolveNearbyAt(lat, lng);
        if (nearby.length > 1) {
          applyNearbyContexts(nearby);
          toast.message(recallLine || `${placeLabel} — 이 근처 맥락`);
          return;
        }
        focusContextByEventId(recallEventId);
        toast.message(recallLine || `${placeLabel}에 도착했어요`);
      },
    },
    { enabled: layerMode === "personal" },
  );

  const focusContextOnMap = useCallback(
    async (eventId: string, options?: { needsPlaceVerify?: boolean }) => {
      const key = eventId.trim();
      if (!key) {
        return;
      }
      if (options?.needsPlaceVerify) {
        const result = await focusGlobeContextOnMap(key);
        if (!result?.cluster) {
          toast.error("맥락을 찾지 못했어요");
          return;
        }
        setStackClusters(null);
        setActiveCluster(result.cluster);
        setSheetOpen(false);
        setContextTapPhase("awaiting_replay");
        globeRef.current?.flyToPin(
          result.cluster.lat,
          result.cluster.lng,
          "street",
          { pinViewportY: 0.58 },
        );
        const params = new URLSearchParams(window.location.search);
        if (params.get("recallEvent") !== key) {
          params.set("recallEvent", key);
          const next = `${window.location.pathname}?${params.toString()}`;
          window.history.replaceState(null, "", next);
        }
        if (canOfferGlobeLocationPrompt()) {
          markGlobeLocationPromptOffered();
          setPlaceVerifyEventId(key);
        }
        return;
      }
      focusContextByEventId(key, { openSheet: false });
    },
    [focusContextByEventId],
  );

  const onKnowledgePlacementPending = useCallback((pending: GlobeKnowledgePlacementPending) => {
    setKnowledgePlacementPending(pending);
  }, []);

  const onKnowledgePlacementDismiss = useCallback(() => {
    setKnowledgePlacementPending(null);
  }, []);

  const onKnowledgePlacementConfirmed = useCallback(
    (input: { anchorEventId: string; knowledgeBoxLabel: string }) => {
      setKnowledgePlacementPending(null);
      void focusContextOnMap(input.anchorEventId);
    },
    [focusContextOnMap],
  );

  const onRecallEventId = useCallback(
    (eventId: string) => {
      const key = eventId.trim();
      if (!key) {
        return;
      }
      if (dismissedAssistantRecallRef.current === key) {
        return;
      }
      setListOpen(false);
      setManageOpen(false);
      setBrainProjectionEventId(null);
      // Deep-link / recall must open Context AI PromptFrame — focus alone
      // only highlights the pin and leaves the assistant missing.
      void bindContextAgentToEventIdRef.current(key);
    },
    [],
  );

  useEffect(() => {
    const eventId = activeCluster?.eventId?.trim();
    if (!eventId) {
      return;
    }
    const sync = () => {
      if (pinDragActiveRef.current) {
        return;
      }
      const next = resolveGlobeContextPinCluster(eventId);
      if (!next) {
        return;
      }
      setActiveCluster((prev) => {
        if (!prev || prev.eventId !== eventId) {
          return prev;
        }
        if (prev.lat === next.lat && prev.lng === next.lng) {
          return prev;
        }
        if (readGlobeContextAgentSession().phase === "bound") {
          snapGlobeToContextAgentAnchor(globeRef, next);
        } else {
          globeRef.current?.flyToPin(next.lat, next.lng, "neighborhood");
        }
        return next;
      });
    };
    window.addEventListener(EVENT_CANDIDATES_UPDATED, sync);
    window.addEventListener(PERSONAL_GLOBE_PINS_UPDATED, sync);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, sync);
      window.removeEventListener(PERSONAL_GLOBE_PINS_UPDATED, sync);
    };
  }, [activeCluster?.eventId]);

  const onPinRelocate = useCallback(
    (input: { pinId: string; sourceEventId: string; lat: number; lng: number }) => {
      pinDragActiveRef.current = true;
      draggedEventIdRef.current = input.sourceEventId;
      setPinDragOverrides((prev) => {
        const next = new Map(prev);
        next.set(input.pinId, { lat: input.lat, lng: input.lng });
        return next;
      });
      setActiveCluster((prev) =>
        prev?.eventId === input.sourceEventId
          ? { ...prev, lat: input.lat, lng: input.lng }
          : prev,
      );
    },
    [],
  );

  const pinCoordOverrides = useMemo(() => pinDragOverrides, [pinDragOverrides]);

  useEffect(() => {
    activeClusterRef.current = activeCluster;
    contextTapPhaseRef.current = contextTapPhase;
    stackClustersRef.current = stackClusters;
    sheetOpenRef.current = sheetOpen;
  }, [activeCluster, contextTapPhase, stackClusters, sheetOpen]);

  useEffect(() => {
    setMapMediaReplayDismissedEventId(null);
  }, [activeCluster?.eventId]);

  useGlobeContextPlaceAlignment({
    userLat: liveLocation?.lat ?? null,
    userLng: liveLocation?.lng ?? null,
    onAligned: ({ startupView, updated }) => {
      if (
        updated <= 0 ||
        activeClusterRef.current ||
        sheetOpenRef.current ||
        recallEventId ||
        !startupView
      ) {
        return;
      }
      globeRef.current?.flyToPin(
        startupView.lat,
        startupView.lng,
        startupView.level,
      );
    },
  });

  useEffect(() => {
    if (searchParams.get("openGlobeInbox") !== "1") {
      return;
    }
    setGlobeInboxOpen(true);
    const params = new URLSearchParams(window.location.search);
    params.delete("openGlobeInbox");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [searchParams]);

  useEffect(() => {
    const ingress = parseFieldDashboardIngressFromSearchParams(searchParams);
    if (!ingress) {
      return;
    }
    openFieldDashboardIngress(ingress);
    const params = new URLSearchParams(window.location.search);
    clearFieldDashboardSearchParams(params);
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [searchParams]);

  useEffect(() => {
    return subscribeFieldFlyToIntent((record) => {
      setMarketFocusEventId(record.eventId);
      globeRef.current?.flyToPin(record.anchorLat, record.anchorLng, "street", {
        pinViewportY: 0.58,
      });
      focusContextByEventId(record.eventId, { openSheet: false });
    });
  }, [focusContextByEventId]);

  useEffect(() => {
    return () => {
      if (revertTimerRef.current !== null) {
        window.clearTimeout(revertTimerRef.current);
      }
    };
  }, []);

  const onStackSelect = useCallback(
    (cluster: PinCluster) => {
      const eventId = cluster.eventId?.trim();
      if (!eventId) {
        return;
      }
      if (readGlobeContextAgentSession().phase === "arming") {
        void bindContextAgentToEventId(eventId);
        return;
      }
      setBrainProjectionEventId(null);
      openContextCluster(cluster);
    },
    [bindContextAgentToEventId, openContextCluster],
  );

  const openContextByEventId = useCallback(
    (eventId: string) => {
      if (readGlobeContextAgentSession().phase === "arming") {
        void bindContextAgentToEventId(eventId);
        return;
      }
      setListOpen(false);
      setBrainProjectionEventId(null);
      focusContextByEventId(eventId, { openSheet: true });
    },
    [bindContextAgentToEventId, focusContextByEventId],
  );

  const openProjectedContext = useCallback(
    (entry: GlobeManageContextEntry) => {
      setManageOpen(false);
      focusContextByEventId(entry.eventId, { openSheet: true });
    },
    [focusContextByEventId],
  );

  const openContextEntry = useCallback(
    (entry: GlobeContextTimelineEntry) => {
      if (readGlobeContextAgentSession().phase === "arming") {
        void bindContextAgentToEventId(entry.eventId);
        return;
      }
      openContextByEventId(entry.eventId);
    },
    [bindContextAgentToEventId, openContextByEventId],
  );

  /** Sidebar preview — fly to context without opening bridge sheet. */
  const previewContextEntry = useCallback(
    (entry: GlobeContextTimelineEntry) => {
      if (readGlobeContextAgentSession().phase === "arming") {
        void bindContextAgentToEventId(entry.eventId);
        return;
      }
      setBrainProjectionEventId(null);
      void focusContextByEventId(entry.eventId, { openSheet: false });
    },
    [bindContextAgentToEventId, focusContextByEventId],
  );

  const bindContextAgentToEntry = useCallback(
    async (entry: GlobeContextTimelineEntry) => {
      await bindContextAgentToEventId(entry.eventId);
    },
    [bindContextAgentToEventId],
  );

  const clearRecallEventFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("recallEvent")) {
      return;
    }
    params.delete("recallEvent");
    const next = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(next, { scroll: false });
  }, [pathname, router]);

  const dismissContextAgentPanel = useCallback(() => {
    const closingId =
      contextConditionPanelEventId?.trim() ||
      contextAgentSession.boundEventId?.trim() ||
      recallEventId?.trim() ||
      null;
    if (closingId) {
      dismissedAssistantRecallRef.current = closingId;
    }
    closeGlobeContextConditionPanel();
    clearGlobeContextAgent();
    resetContextAgentRuntime();
    exitContextSoloStage();
    // Must use Next router — history.replaceState alone leaves useSearchParams stale,
    // and RimvioGlobeHub re-binds PromptFrame from initialRecallEventId.
    clearRecallEventFromUrl();
  }, [
    clearRecallEventFromUrl,
    contextAgentSession.boundEventId,
    contextConditionPanelEventId,
    recallEventId,
  ]);

  const openGlobeChat = useCallback(() => {
    // Hard exclusion — 맞춤 대화 and 맥락 어시스턴트 must not stack.
    if (
      isGlobeContextConditionPanelOpen() ||
      readGlobeContextAgentSession().phase === "bound" ||
      readGlobeContextAgentSession().phase === "arming"
    ) {
      closeGlobeContextConditionPanel();
      clearGlobeContextAgent();
      resetContextAgentRuntime();
      cancelGlobeContextAgentArm();
      setStackClusters(null);
    }
    ensureGlobeChatGraphId();
    setGlobeChatOpen(true);
  }, []);

  useEffect(() => {
    if (!contextConditionPromptOpen) {
      return;
    }
    // Bind/recall path already dismisses chat; keep the invariant if chat re-opens.
    setGlobeChatOpen(false);
  }, [contextConditionPromptOpen]);

  // Hard exclusion — Pending Reality and 맥락 어시스턴트 must not stack.
  useEffect(() => {
    if (!fieldSheetOpen) {
      return;
    }
    if (
      contextConditionPanelOpenRef.current ||
      isGlobeContextConditionPanelOpen()
    ) {
      dismissContextAgentPanel();
      cancelGlobeContextAgentArm();
      setStackClusters(null);
    }
  }, [dismissContextAgentPanel, fieldSheetOpen]);

  useEffect(() => {
    if (!contextConditionPromptOpen) {
      return;
    }
    dispatchCloseFieldSheet();
  }, [contextConditionPromptOpen]);

  const toggleContextAgentArm = useCallback(() => {
    if (readGlobeContextAgentSession().phase === "arming") {
      cancelGlobeContextAgentArm();
      setStackClusters(null);
      return;
    }
    if (readGlobeContextAgentSession().phase === "bound") {
      dismissContextAgentPanel();
      return;
    }
    const activeId = activeCluster?.eventId?.trim();
    if (activeId) {
      void bindContextAgentToEventId(activeId);
      return;
    }
    dismissCompetingGlobeSurfaces();

    const nearbyStack = stackClustersRef.current ?? [];
    const connectable =
      nearbyStack.length > 1
        ? nearbyStack
        : listConnectableGlobeContextPinClusters();

    if (connectable.length >= 1) {
      armGlobeContextAgent();
      setStackClusters([...connectable]);
      setActiveCluster(null);
      setSheetOpen(false);
      toast.message(copy.globe.contextAgentStackPickSubtitle);
      return;
    }

    toast.message(copy.globe.containerSpaceAgentPickHint);
  }, [
    activeCluster?.eventId,
    bindContextAgentToEventId,
    dismissCompetingGlobeSurfaces,
    dismissContextAgentPanel,
  ]);

  const handleContextsDeleted = useCallback(
    (eventIds: string[]) => {
      if (activeCluster && eventIds.includes(activeCluster.eventId)) {
        setSheetOpen(false);
        setActiveCluster(null);
        exitContextSoloStage({ onlyIfContextEventId: activeCluster.eventId });
      }
      if (realitySurfaceEventId && eventIds.includes(realitySurfaceEventId)) {
        clearRealitySurfaceSession();
        setDepartureHubPickerOpen(false);
      }
      if (
        contextAgentSession.boundEventId &&
        eventIds.includes(contextAgentSession.boundEventId)
      ) {
        dismissContextAgentPanel();
      }
      const params = new URLSearchParams(window.location.search);
      const recall = params.get("recallEvent");
      if (recall && eventIds.includes(recall)) {
        params.delete("recallEvent");
        const next = params.toString()
          ? `${window.location.pathname}?${params.toString()}`
          : window.location.pathname;
        window.history.replaceState(null, "", next);
      }
    },
    [
      activeCluster,
      clearRealitySurfaceSession,
      contextAgentSession.boundEventId,
      dismissContextAgentPanel,
      realitySurfaceEventId,
    ],
  );

  const onDiscoveryMarketBrowse = useCallback(() => {
    openFieldDashboardIngress({ tab: "queue" });
    const marketPin = clustersRef.current.find(
      (cluster) => cluster.marketRole && cluster.origin === "external",
    );
    if (marketPin) {
      globeRef.current?.flyToPin(marketPin.lat, marketPin.lng, "street", {
        pinViewportY: 0.58,
      });
      setActiveCluster(marketPin);
      return;
    }
    toast.message(copy.globe.discoveryMarketBrowseEmpty);
  }, []);

  const beginPhotoIngestFlow = useCallback(async (files: File[]) => {
    if (layerMode === "discovery") {
      toast.message(copy.globe.ingestDiscoveryNoTrace);
      return;
    }
    if (files.length === 0) {
      return;
    }
    const validated = validateIngestMediaFiles(files);
    if (!validated.ok) {
      toast.error(validated.message);
      return;
    }
    if (validated.skippedCount > 0) {
      toast.message(copy.globe.photoIngestSkippedUnsupported(validated.skippedCount));
    }
    const mediaFiles = validated.files;
    revokePhotoIngestPreviewUrls(photoFileProgressRef.current);
    const progressItems = buildPhotoIngestFileItems(mediaFiles);
    photoFileProgressRef.current = progressItems;
    setPhotoFileProgress(progressItems);
    setConfirmDraft(null);
    setConfirmError(null);
    setConfirmPreparing(true);
    setConfirmOpen(true);
    try {
      const draft = await prepareGlobePhotoIngestDraft(mediaFiles, {
        onFileStart: (index) => {
          setPhotoFileProgress((rows) => {
            const next = patchPhotoIngestFileItem(rows, index, { status: "reading" });
            photoFileProgressRef.current = next;
            return next;
          });
        },
        onFileReady: (index) => {
          setPhotoFileProgress((rows) => {
            const next = patchPhotoIngestFileItem(rows, index, { status: "ready" });
            photoFileProgressRef.current = next;
            return next;
          });
        },
      });
      if (!draft) {
        setConfirmError(copy.globe.photoIngestUnsupportedFormat);
        setPhotoFileProgress((rows) =>
          rows.map((row) => ({ ...row, status: "error" as const })),
        );
        return;
      }
      setPhotoFileProgress((rows) =>
        rows.map((row) =>
          row.status === "error" ? row : { ...row, status: "ready" as const },
        ),
      );
      setConfirmDraft(draft);
    } catch (caught) {
      const message =
        caught instanceof Error && caught.message.trim()
          ? caught.message.trim()
          : copy.globe.contextConfirmPrepareFail;
      setConfirmError(message);
      toast.error(message);
      setPhotoFileProgress((rows) =>
        rows.map((row) => ({ ...row, status: "error" as const })),
      );
    } finally {
      setConfirmPreparing(false);
    }
  }, [layerMode]);

  const resetPhotoIngestFlow = useCallback(() => {
    revokePhotoIngestPreviewUrls(photoFileProgressRef.current);
    photoFileProgressRef.current = [];
    setPhotoFileProgress([]);
    setPhotoRetryingIndex(null);
    setConfirmOpen(false);
    setConfirmDraft(null);
    setConfirmError(null);
    setConfirmPreparing(false);
  }, []);

  const handleCommitFileIndexProgress = useCallback(
    (event: GlobeMediaIngestProgressEvent) => {
      setPhotoFileProgress((rows) => {
        let next = rows;
        if (event.phase === "committing") {
          next = markPhotoIngestFileCommitting(rows, event.fileIndex);
        } else if (event.phase === "done") {
          next = markPhotoIngestFileDone(rows, event.fileIndex);
        } else {
          next = markPhotoIngestFileError(rows, event.fileIndex, event.message);
        }
        photoFileProgressRef.current = next;
        return next;
      });
    },
    [],
  );

  const handleRetryPhotoFile = useCallback(
    async (fileIndex: number) => {
      if (!confirmDraft || photoRetryingIndex !== null) {
        return;
      }
      setPhotoRetryingIndex(fileIndex);
      setPhotoFileProgress((rows) => {
        const next = markPhotoIngestFileCommitting(rows, fileIndex);
        photoFileProgressRef.current = next;
        return next;
      });
      try {
        const result = await retryGlobePhotoIngestFile({
          draft: confirmDraft,
          fileIndex,
          hintEventId: activeCluster?.eventId ?? null,
          hintTitle: activeCluster?.title ?? null,
          forceAttachToHint: Boolean(activeCluster?.eventId),
        });
        setPhotoFileProgress((rows) => {
          const next = result.error
            ? markPhotoIngestFileError(rows, fileIndex, result.error)
            : markPhotoIngestFileDone(rows, fileIndex);
          photoFileProgressRef.current = next;
          return next;
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.eventId) {
          setMediaStoreRevision((value) => value + 1);
          void focusContextOnMap(result.eventId);
        }
        toast.success(copy.globe.memoriesFootprintSaved(rimvioHonorific));
      } finally {
        setPhotoRetryingIndex(null);
      }
    },
    [
      activeCluster?.eventId,
      activeCluster?.title,
      confirmDraft,
      focusContextOnMap,
      photoRetryingIndex,
      rimvioHonorific,
    ],
  );

  const dispatchGlobeHomePhotoWalkthrough = useCallback(
    (files: readonly File[]) => {
      if (files.length === 0) {
        return;
      }
      void dispatchContextRun(
        {
          kind: "photo",
          files: [...files],
          surface: "globe_home",
          layerMode: layerMode === "discovery" ? "discovery" : "personal",
          mode: "walkthrough",
        },
        {
          openPortal: async () => {},
          openFieldDiscovery: onDiscoveryMarketBrowse,
          tryQuickListMarket: async () => false,
          navigateUrl: (url, label) => {
            window.location.assign(url);
            toast.success(`${label} 여는 중…`);
          },
          onPhotoWalkthrough: beginPhotoIngestFlow,
          toastMessage: (message) => toast.message(message),
        },
      );
    },
    [beginPhotoIngestFlow, layerMode, onDiscoveryMarketBrowse],
  );

  const ingestDroppedMediaFiles = useCallback(
    (fileList: FileList | DataTransferItemList | readonly File[]) => {
      const raw =
        fileList instanceof DataTransferItemList
          ? Array.from(fileList)
              .filter((item) => item.kind === "file")
              .map((item) => item.getAsFile())
              .filter((file): file is File => file instanceof File)
          : Array.from(fileList as Iterable<File>);
      const validated = validateIngestMediaFiles(raw);
      if (!validated.ok) {
        toast.error(validated.message);
        return;
      }
      dispatchGlobeHomePhotoWalkthrough(validated.files);
    },
    [dispatchGlobeHomePhotoWalkthrough],
  );

  useEffect(() => {
    return subscribeGlobePhotoIngest((files) => {
      dispatchGlobeHomePhotoWalkthrough(files);
    });
  }, [dispatchGlobeHomePhotoWalkthrough]);

  const openPhotoPicker = useCallback(() => {
    createPhotoRef.current?.click();
  }, []);

  const onTrendBridgeModeChange = useCallback(
    (enabled: boolean) => {
      setTrendBridgeEnabled(enabled);
      if (enabled) {
        toast.message(copy.globe.trendBridgePulseSwitch);
      }
    },
    [setTrendBridgeEnabled],
  );

  const onTrendBridgeSelect = useCallback(
    (bridgeId: string) => {
      setTrendBridgeActiveId(bridgeId);
      const feature = getTrendBridgeFeature(bridgeId);
      if (feature) {
        toast.message(copy.globe.trendBridgeEnabledToast(feature.displayName));
        toast.message(copy.globe.trendBridgePulseWonder, { duration: 3200 });
      }
    },
    [setTrendBridgeActiveId],
  );

  const onTrendBridgePulseIntentChange = useCallback(
    (intent: "align" | "avoid") => {
      setTrendBridgePulseIntent(intent);
    },
    [setTrendBridgePulseIntent],
  );

  const openPortal = useCallback(
    async (input: {
      eventId?: string | null;
      composeText?: string;
      source?: PortalOpenSource;
      initialIntentId?: PortalIntentId | null;
    }) => {
      if (marketTradeBusy) {
        return;
      }
      setMarketTradeBusy(true);
      try {
        let event: EventCandidate | null = null;
        const key = input.eventId?.trim();
        if (key) {
          event =
            findLifeEventCandidate(key) ?? recoverGlobeContextEventFromPin(key);
        }
        if (!event && input.composeText?.trim()) {
          const outcome = await commitTextContextIngress(input.composeText.trim());
          event = outcome.result.event;
        }
        if (!event) {
          const attachId = activeCluster?.eventId?.trim();
          if (attachId) {
            event =
              findLifeEventCandidate(attachId) ??
              recoverGlobeContextEventFromPin(attachId);
          }
        }
        if (!event) {
          const outcome = await commitTextContextIngress(
            input.composeText?.trim() || copy.portal.homeTitle,
          );
          event = outcome.result.event;
        }
        setPortalEvent(event);
        setPortalComposeText(input.composeText);
        setPortalSource(input.source ?? "composer");
        setPortalInitialIntentId(input.initialIntentId ?? null);
        setPortalOpen(true);
        setHubDetailOpen(false);
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : copy.globe.ingestAttachFail;
        toast.error(message);
      } finally {
        setMarketTradeBusy(false);
      }
    },
    [activeCluster, marketTradeBusy, copy],
  );

  const onPortalIntentPeekSelect = useCallback(
    (intentId: PortalIntentId) => {
      setPortalPeekOpen(false);
      void openPortal({
        initialIntentId: intentId,
        eventId: activeCluster?.eventId ?? null,
        source: "composer",
      });
    },
    [activeCluster?.eventId, openPortal],
  );

  const focusResourceOnInnerGlobe = useCallback(
    (input: { eventId: string; anchorLat: number; anchorLng: number }) => {
      setGlobeChatOpen(false);
      setLayerMode("personal");
      setMarketFocusEventId(input.eventId);
      globeRef.current?.flyToPin(input.anchorLat, input.anchorLng, "street", {
        pinViewportY: 0.58,
      });
      focusContextByEventId(input.eventId, { openSheet: false });
      setPersonalGlobeOpen(true);
    },
    [focusContextByEventId, setLayerMode],
  );

  const focusResourceOnOuterGlobe = useCallback(
    (input: { eventId: string; anchorLat: number; anchorLng: number }) => {
      // ADR-027: one Globe — no discovery planet; fly on personal + Field for neighbor posts.
      setGlobeChatOpen(false);
      setLayerMode("personal");
      setMarketFocusEventId(input.eventId);
      globeRef.current?.flyToPin(input.anchorLat, input.anchorLng, "street", {
        pinViewportY: 0.58,
      });
      focusContextByEventId(input.eventId, { openSheet: false });
      openFieldMineIngress();
    },
    [focusContextByEventId, setLayerMode],
  );

  const quickListMarket = useCallback(
    async (input: {
      composeText: string;
      eventId?: string | null;
    }): Promise<boolean> => {
      if (marketTradeBusy) {
        return false;
      }
      setMarketTradeBusy(true);
      try {
        let eventId = input.eventId?.trim() || "";
        if (!eventId) {
          const outcome = await commitTextContextIngress(input.composeText.trim());
          eventId = outcome.result.event.id;
        }
        const saved = await commitMarketIntentQuickList({
          composeText: input.composeText,
          eventId,
          liveLat: liveLocation?.lat ?? null,
          liveLng: liveLocation?.lng ?? null,
        });
        if (!saved) {
          return false;
        }
        const graphId = buildComposerGraphId(saved.eventId, input.composeText.trim());
        syncResourceCompleteToChat({ graphId, record: saved });
        markComposeDraftSubmitted(graphId);
        syncMarketQuickListDoneToFeed({
          composeText: input.composeText,
          eventId: saved.eventId,
          productName: saved.detail.productName || saved.title,
          placeLabel: saved.placeLabel,
        });
        finishContextRun();
        setMarketFocusEventId(saved.eventId);
        setMarketIntentRevision((value) => value + 1);
        globeRef.current?.flyToPin(saved.anchorLat, saved.anchorLng, "street", {
          pinViewportY: 0.58,
        });
        focusContextByEventId(saved.eventId, { openSheet: false });
        toast.success(
          copy.globe.marketQuickListToast(
            saved.detail.productName || saved.title,
            saved.placeLabel,
          ),
        );
        return true;
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : copy.globe.ingestAttachFail;
        toast.error(message);
        return false;
      } finally {
        setMarketTradeBusy(false);
      }
    },
    [focusContextByEventId, liveLocation, marketTradeBusy, copy],
  );

  const launchMarketProjection = useCallback(
    (input: { draft: MarketIntentDraft; eventId: string }) => {
      setMarketPortalLaunch(true);
      setMarketWizardStartStep(
        input.draft.role === "listing" ? "photos" : "recognize",
      );
      setMarketIntentDraft(input.draft);
      setMarketConfirmOpen(true);
      setMarketFocusEventId(input.eventId);
    },
    [],
  );

  const onMarketComposeFeedReady = useCallback(
    (input: {
      kind: "wizard" | "quick_list";
      draft?: MarketIntentDraft;
      eventId: string;
      composeText: string;
    }) => {
      pendingMarketComposeRef.current = input;
      setPortalComposeText(input.composeText);
    },
    [],
  );

  const runPendingMarketComposeAction = useCallback(async () => {
    const pending =
      pendingMarketComposeRef.current ??
      resolvePendingMarketComposeAction(resolveComposeSessionGraphId());
    if (!pending) {
      return;
    }
    if (pending.kind === "wizard") {
      const draft =
        pending.draft ??
        buildMarketQuickListDraft({
          text: pending.composeText,
          eventId: pending.eventId,
          liveLat: liveLocation?.lat ?? null,
          liveLng: liveLocation?.lng ?? null,
        });
      if (!draft) {
        return;
      }
      launchMarketProjection({ draft, eventId: pending.eventId });
      pendingMarketComposeRef.current = null;
      return;
    }
    await quickListMarket({
      composeText: pending.composeText,
      eventId: pending.eventId,
    });
    pendingMarketComposeRef.current = null;
  }, [launchMarketProjection, liveLocation?.lat, liveLocation?.lng, quickListMarket]);

  const runPendingMarketComposeWizardAction = useCallback(() => {
    const pending =
      pendingMarketComposeRef.current ??
      resolvePendingMarketComposeAction(resolveComposeSessionGraphId());
    if (!pending) {
      return;
    }
    const draft =
      pending.draft ??
      buildMarketQuickListDraft({
        text: pending.composeText,
        eventId: pending.eventId,
        liveLat: liveLocation?.lat ?? null,
        liveLng: liveLocation?.lng ?? null,
      });
    if (!draft) {
      return;
    }
    launchMarketProjection({ draft, eventId: pending.eventId });
    pendingMarketComposeRef.current = null;
  }, [launchMarketProjection, liveLocation?.lat, liveLocation?.lng]);

  const handleWorkSurfaceClassified = useCallback(
    (_classification: import("@/lib/work-queue/classify-globe-work-surface").GlobeWorkSurfaceClassification) => {
      /* Hint shown on composer strip inside GlobeContextIngestBar */
    },
    [],
  );

  const resumeWorkQueueItem = useCallback(
    (item: WorkQueueItem) => {
      setWorkQueueOpen(false);
      if (item.kind === "portal_compose") {
        openGlobeChat();
        const state = readPortalComposeRunState(item.graphId);
        if ((item.status === "ready_media" || item.needsMedia) && state?.marketDraft) {
          launchMarketProjection({
            draft: state.marketDraft,
            eventId: state.eventId,
          });
        }
        return;
      }
      if (item.kind === "travel_context") {
        openGlobeChat();
      }
    },
    [launchMarketProjection, openGlobeChat],
  );

  const dismissWorkQueueItem = useCallback(
    (item: WorkQueueItem) => {
      completeWorkQueueItem(item.id);
      refreshWorkQueue();
    },
    [refreshWorkQueue],
  );

  const runComposeDetailSlotFill = useCallback(async () => {
    const graphId = resolveComposeSessionGraphId();
    if (!graphId) {
      runPendingMarketComposeWizardAction();
      return;
    }
    const result = await resumeComposeDetailSlotFill({
      graphId,
      liveLat: liveLocation?.lat ?? null,
      liveLng: liveLocation?.lng ?? null,
    });
    if (!result) {
      runPendingMarketComposeWizardAction();
      return;
    }
    if ("state" in result) {
      writePortalComposeRunState(result.state);
    }
    if (result.kind === "clarify") {
      syncPortalComposeClarifyToFeed({
        graphId,
        questionKo: result.questionKo,
        goalKo: result.state.accumulatedText,
        slotId: result.slotId,
      });
      syncPortalComposeClarifyToChat({
        graphId,
        userText: "",
        questionKo: result.questionKo,
        clarifyKind: result.clarifyKind,
        slotId: result.slotId,
        choices: result.choices,
        categoryOptions: result.categoryOptions,
      });
      openGlobeChat();
      return;
    }
    runPendingMarketComposeWizardAction();
  }, [
    liveLocation?.lat,
    liveLocation?.lng,
    openGlobeChat,
    runPendingMarketComposeWizardAction,
  ]);

  useEffect(() => {
    if (portalOpen || marketConfirmOpen) {
      setGlobeChatOpen(false);
    }
  }, [portalOpen, marketConfirmOpen]);

  useEffect(() => {
    return subscribeGlobePortalOpen((request) => {
      if (!shouldOpenGlobeHubDetail()) {
        return;
      }
      void openPortal({
        eventId: request.eventId,
        composeText: request.composeText,
        initialIntentId: request.initialIntentId,
        source: request.source ?? "hub",
      });
    });
  }, [openPortal]);

  useEffect(() => {
    const unsub = subscribeGlobeComposeSeed(() => {
      openGlobeChat();
    });
    if (peekGlobeComposeSeedText()) {
      openGlobeChat();
    }
    return unsub;
  }, [openGlobeChat]);

  useEffect(() => {
    return subscribeGlobeMarketProjectionLaunch(({ draft, eventId, composeText }) => {
      launchMarketProjection({ draft, eventId });
      if (composeText) {
        setPortalComposeText(composeText);
      }
    });
  }, [launchMarketProjection]);

  useEffect(() => {
    return subscribeGlobeMarketQuickListRequest(async (request) => {
      const success = await quickListMarket({
        composeText: request.composeText,
        eventId: request.eventId,
      });
      dispatchGlobeMarketQuickListResult({
        requestId: request.requestId,
        success,
      });
    });
  }, [quickListMarket]);

  const trendBridgeAnchorLat =
    activeCluster?.lat ?? liveLocation?.lat ?? null;
  const trendBridgeAnchorLng =
    activeCluster?.lng ?? liveLocation?.lng ?? null;

  const globeRenderSuspended =
    sheetOpen ||
    captureSheetOpen ||
    hubDetailOpen ||
    portalOpen ||
    marketConfirmOpen ||
    createOpen ||
    listOpen ||
    manageOpen ||
    settingsOpen ||
    globeInboxOpen ||
    fieldOverlayOpen ||
    mediaPoolOpen ||
    bridgeGhostOpen ||
    shareSheetOpen ||
    // Soft keyboard + IME — freeze WebGL only while the PromptFrame is actually up.
    contextConditionPromptOpen ||
    // Context Workspace owns the map — pause 3D tile engine (stops 429 storms).
    workspaceOwnsMapMedia;

  useBridgeMediaSync({
    enabled: Boolean(user?.id) && !globeRenderSuspended,
    priorityEventId: activeCluster?.eventId ?? null,
  });

  useBridgePlanningSyncFeedback(Boolean(user?.id) && !globeRenderSuspended);

  const trendBridgeRollup = useTrendBridgeRollup({
    active: trendBridgeLayerActive && !globeRenderSuspended,
    bridgeId: trendBridgeSettings.activeBridgeId,
    anchorLat: trendBridgeAnchorLat,
    anchorLng: trendBridgeAnchorLng,
  });

  const pulseMainActionEnabled =
    !globeRenderSuspended &&
    !mapMediaFocusOpen &&
    !sheetOpen &&
    !confirmOpen &&
    !portalOpen &&
    !marketConfirmOpen &&
    !hubEventId;

  useEffect(() => {
    setLiveLocationPowerMode("saver");
  }, []);

  const onMemoryTriggerPress = useCallback(
    (trigger: GlobeContextTrigger) => {
      const eventId = trigger.eventId?.trim();
      if (!eventId) {
        return;
      }
      const openOptions = resolveContextTriggerOpenOptions(trigger);
      if (openOptions.mapTap) {
        void focusContextByEventId(eventId, { openSheet: false, mapTap: true });
        return;
      }
      void focusContextByEventId(eventId, {
        openSheet: true,
        sheetPage: openOptions.sheetPage,
      });
    },
    [focusContextByEventId],
  );

  const onResumeSession = useCallback(
    (session: GlobeResumeSession) => {
      setBrainProjectionEventId(null);
      const eventId = session.eventId.trim();
      if (!eventId) return;

      // Reality OS: Context resume → Workspace (not PinOpenSheet / Bridge).
      if (session.kind === "context") {
        const resumed = resumeCapsuleWorkspace({
          contextEventId: eventId,
          utterance: session.title,
          expand: true,
        });
        if (resumed) {
          toast.message(copy.globe.workspaceResumeToast);
          return;
        }
      }

      void focusContextByEventId(eventId, {
        openSheet: session.kind === "market",
        mapTap: session.kind === "context",
      });
    },
    [focusContextByEventId],
  );

  const showBrainSurfaceOntologyPeek = Boolean(
    brainSurfaceVisible &&
      activeBrainSurfaceCandidate &&
      !brainSurfaceDetailMode &&
      !brainSurfaceShadowExpanded &&
      !placeActionGraphOpen,
  );
  const showBrainSurfacePreviewChrome = showBrainSurfaceOntologyPeek;
  const showBrainSurfaceDetailChrome = Boolean(
    brainSurfaceDetailMode &&
      activeBrainSurfaceNode &&
      activeBrainSurfacePresentation &&
      activeContextEvent,
  );
  const detailDockVideoEmbedSrc = activeBrainSurfaceGuide?.embedUrl?.trim() ?? null;
  const detailDockVideoEmbedKey = useMemo(() => {
    const raw = activeBrainSurfaceGuide?.embedUrl;
    return (raw ? extractYouTubeVideoId(raw) : null) ?? activeBrainSurfaceGuide?.guideNodeId ?? "detail-video";
  }, [activeBrainSurfaceGuide?.embedUrl, activeBrainSurfaceGuide?.guideNodeId]);

  /** 오사카 영상 → 오사카 좌표 (서울 GPS hub 무시). */
  const brainSurfaceVideoMapAnchor = useMemo(() => {
    if (!activeBrainSurfaceCandidate && !activeBrainSurfaceGuide) {
      return null;
    }
    return resolveVideoMapAnchor({
      title:
        activeBrainSurfaceGuide?.title ??
        activeBrainSurfaceCandidate?.previewTitle ??
        null,
      placeLabel: activeBrainSurfaceCandidate?.placeLabel ?? null,
      relatedPlaceLabel: activeBrainSurfaceGuide?.relatedPlaceLabel ?? null,
      lat: activeBrainSurfaceCandidate?.lat,
      lng: activeBrainSurfaceCandidate?.lng,
    });
  }, [activeBrainSurfaceCandidate, activeBrainSurfaceGuide]);

  const fieldExecutionOpen = Boolean(marketConfirmOpen || portalOpen);

  const threeFloorsStage = useMemo(
    () =>
      resolveGlobeThreeFloorsStage({
        showMapVideoReplay,
        brainSurfaceVisible,
        brainSurfaceDisclosureStage,
        showOntologyPeek: showBrainSurfaceOntologyPeek,
        fieldExecutionOpen,
      }),
    [
      brainSurfaceDisclosureStage,
      brainSurfaceVisible,
      fieldExecutionOpen,
      showBrainSurfaceOntologyPeek,
      showMapVideoReplay,
    ],
  );

  const rimvioUxSurfaceMode = useMemo(
    () => resolveRimvioUxSurfaceMode({ fieldExecutionOpen }),
    [fieldExecutionOpen],
  );

  const suppressGlobePriorityChrome = shouldSuppressGlobePriorityChrome({
    showMapVideoReplay,
    showOntologyPeek: showBrainSurfaceOntologyPeek,
    brainSurfaceVisible,
    fieldExecutionOpen,
  });

  const brainSurfaceClosureLine = useMemo(
    () =>
      activeBrainSurfaceCandidate
        ? resolveBrainSurfaceClosureLine(activeBrainSurfaceCandidate)
        : null,
    [activeBrainSurfaceCandidate],
  );

  useEffect(() => {
    if (!showBrainSurfaceDetailChrome || !brainSurfaceVideoMapAnchor) {
      return;
    }
    const { lat, lng } = brainSurfaceVideoMapAnchor;
    globeRef.current?.flyToPin(lat, lng, "street", {
      pinViewportY: 0.5,
    });
  }, [brainSurfaceVideoMapAnchor, showBrainSurfaceDetailChrome]);

  return (
    <GlobeHomeMemoryRecallProvider
      enabled={!globeRenderSuspended}
      layerMode={layerMode}
      activeEventId={activeCluster?.eventId ?? null}
      globeDismissToken={globeMemoryDismissToken}
      registerComposeHandlers={registerMemoryRecallComposeHandlers}
      onActivateTrigger={onMemoryTriggerPress}
      onResumeSession={onResumeSession}
    >
    <div
      ref={surfaceRef}
      className="relative flex h-full min-h-0 flex-1 flex-col"
      data-surface="globe-home"
      onDragEnter={(event) => {
        if (layerMode === "discovery" || confirmOpen) {
          return;
        }
        if (!event.dataTransfer.types.includes("Files")) {
          return;
        }
        event.preventDefault();
        photoDropDepthRef.current += 1;
        setPhotoDropActive(true);
      }}
      onDragLeave={() => {
        photoDropDepthRef.current = Math.max(0, photoDropDepthRef.current - 1);
        if (photoDropDepthRef.current === 0) {
          setPhotoDropActive(false);
        }
      }}
      onDragOver={(event) => {
        if (layerMode === "discovery" || confirmOpen) {
          return;
        }
        if (!event.dataTransfer.types.includes("Files")) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        photoDropDepthRef.current = 0;
        setPhotoDropActive(false);
        if (layerMode === "discovery" || confirmOpen) {
          return;
        }
        event.preventDefault();
        if (event.dataTransfer.files?.length) {
          ingestDroppedMediaFiles(event.dataTransfer.files);
        }
      }}
    >
      {photoDropActive ? (
        <div
          className="pointer-events-none absolute inset-3 z-[28] flex items-center justify-center rounded-[1.75rem] border-2 border-dashed border-primary/55 bg-primary/8 backdrop-blur-[2px]"
          data-globe-photo-drop-target
        >
          <p className="rounded-full bg-white/92 px-4 py-2 text-[13px] font-semibold text-foreground shadow-sm">
            {copy.globe.photoIngestDropHint}
          </p>
        </div>
      ) : null}
      <GlobeRealityCommitPulseBadge
        visible={Boolean(realityCommitPulseEventId)}
        label={
          osakaDemoTheater.commitPulseLabelKo?.trim() ||
          copy.globe.field.realityCommitPulseBadge
        }
      />
      {/* —— L1 Globe stage (pins · recall) —— */}
      <div
        className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden"
        data-globe-map-stage
      >
      <RimvioGlobeHubClient
        globeRef={globeRef}
        className="h-full min-h-0 flex-1"
        initialRecallEventId={recallEventId}
        onRecallEventId={onRecallEventId}
        highlightedPinId={activeCluster?.pinId ?? null}
        onPinPress={onPinPress}
        onContextGroupPress={onContextGroupPress}
        onGlobePress={onGlobePress}
        onClustersSnapshot={onClustersSnapshot}
        onDetailLevelChange={onDetailLevelChange}
        pinRelocateEnabled={layerMode === "personal"}
        onPinRelocate={onPinRelocate}
        timeFilter={timeFilter}
        peopleFilter={peopleFilter}
        pinCoordOverrides={pinCoordOverrides}
        bridgeGhostClusters={
          osakaDemoTheaterActive ? [] : bridgeGhostClusters
        }
        renderSuspended={globeRenderSuspended}
        focusedContextEventId={
          contextAgentBoundEventId ?? activeCluster?.eventId ?? null
        }
        realityBridgeArcs={realityBridgeArcs}
        showInteractionHint={false}
        layerMode={layerMode}
        lodgingDiscoveryCards={lodgingDiscovery.cardByResourceId}
        eateryDiscoveryCards={eateryDiscovery.cardByResourceId}
        brainSurfaceMarkers={hubBrainSurfaceMarkers}
        brainSurfaceTraceArcs={brainSurfaceTraceArcs}
        onBrainSurfaceMarkerPress={handleBrainSurfaceMarkerPress}
        contextConditionDiscoveryOverlay={contextConditionDiscoveryOverlay}
        discoveryLensSession={discoveryLensSession}
        contextAgentPickMode={contextAgentSession.phase === "arming"}
      />
      <GlobeContextBrainMapOverlay
        visible={brainProjectionVisible}
        event={activeContextEvent}
        anchorLat={
          activeContextEvent
            ? resolveStableContextPlaceAnchor(activeContextEvent).lat
            : (activeCluster?.lat ?? null)
        }
        anchorLng={
          activeContextEvent
            ? resolveStableContextPlaceAnchor(activeContextEvent).lng
            : (activeCluster?.lng ?? null)
        }
        globeRef={globeRef}
        containerRef={surfaceRef}
        onClose={() => setBrainProjectionEventId(null)}
        onProjectionReady={launchBrainSurfaceProjection}
      />
      {showBrainSurfaceDetailChrome && detailDockVideoEmbedSrc ? (
        <GlobeBrainSurfaceVideoChip
          embedSrc={detailDockVideoEmbedSrc}
          embedKey={detailDockVideoEmbedKey}
          title={activeBrainSurfaceGuide?.title ?? activeBrainSurfaceCandidate?.previewTitle ?? "영상"}
          caption={activeBrainSurfaceCandidate?.previewBody}
          eyebrow={activeBrainSurfaceCandidate?.placeLabel}
          lat={brainSurfaceVideoMapAnchor?.lat ?? activeBrainSurfaceCandidate?.lat}
          lng={brainSurfaceVideoMapAnchor?.lng ?? activeBrainSurfaceCandidate?.lng}
          thumbnailUrl={activeBrainSurfaceGuide?.thumbnailUrl ?? activeBrainSurfaceCandidate?.markerThumbnailUrl}
          onClose={dismissBrainSurfacePreview}
          placement="pin"
          globeRef={globeRef}
        />
      ) : null}
      {placeActionGraphOpen && !osakaDemoTheaterActive ? (
        <GlobePlaceActionGraphStage
          onExploreNode={handlePlaceExploreProject}
          onActionNode={handlePlaceExploreAction}
          onClose={() => {
            clearPlaceExploreSession();
            setPlaceActionGraphOpen(false);
          }}
        />
      ) : null}
      <div className="pointer-events-none absolute right-3 top-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))] z-[33] flex flex-col items-end gap-2">
        <GlobeOsakaDemoStage
          progress={osakaDemoProgress}
          running={
            osakaDemoRunning ||
            Boolean(osakaDemoProgress) ||
            osakaDemoTheater.active
          }
          approving={osakaDemoApproving}
          onApprove={handleOsakaDemoApprove}
          onRewind={handleOsakaDemoRewind}
          onContinue={handleOsakaDemoContinue}
          onCancel={handleOsakaDemoCancel}
          onDismiss={() => {
            setOsakaDemoProgress(null);
            resetOsakaDemoTheaterState();
          }}
        />
        <GlobeActionPlanCard
          onOpenApprovals={() =>
            openFieldDashboardIngress({ tab: "queue" })
          }
        />
      </div>
      <div className="pointer-events-none absolute bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.75rem))] right-3 z-[33]">
        <GlobeOsakaDemoPrepCard
          prep={osakaDemoTheater.prepCard}
          awaitingApprove={
            osakaDemoTheater.awaitingApprove ||
            osakaDemoProgress?.status === "awaiting_approve"
          }
          approving={osakaDemoApproving}
          onApprove={handleOsakaDemoApprove}
        />
      </div>
      {showBrainSurfaceOntologyPeek && activeBrainSurfaceCandidate ? (
        <GlobeBrainSurfaceOntologyPeek
          key={activeBrainSurfaceCandidate.id}
          anchor={activeBrainSurfaceCandidate}
          related={brainSurfaceConnectRelated}
          mediaGuide={activeBrainSurfaceGuide}
          activeRelatedId={brainSurfaceActiveCandidateId}
          onSelectRelated={(candidateId) => handleBrainSurfaceMarkerPress(candidateId)}
          onExpandMap={
            showActiveVideoExpandMap ? handleExpandActiveVideoInferredMap : null
          }
          inferredPlaceCount={
            activeVideoInferredPlaceCount > 0 ? activeVideoInferredPlaceCount : undefined
          }
          onOpenDetail={
            activeBrainSurfaceNode ? () => setBrainSurfaceDetailMode(true) : null
          }
          onClose={dismissBrainSurfacePreview}
          globeRef={globeRef}
          mapExpanded={brainSurfaceShadowExpanded}
          tracePlaces={brainSurfaceTracePlaces}
        />
      ) : null}
      {showBrainSurfaceDetailChrome ? (
        <GlobeBrainSurfaceFloatingFrame
          frameId="brain-surface-detail"
          dragLabel="상세 정보 이동"
          shellClassName="overflow-hidden rounded-b-[1rem] rounded-t-none border border-t-0 border-white/85 bg-white/94 text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur-2xl ring-1 ring-black/[0.04]"
          bodyClassName="p-0"
        >
          <GlobeContextBrainNodeCard
            variant="embedded"
            videoDetached={Boolean(detailDockVideoEmbedSrc)}
            contextTitle={
              activeContextEvent!.place?.trim() || activeContextEvent!.title.trim() || "맥락"
            }
            node={activeBrainSurfaceNode!}
            presentation={activeBrainSurfacePresentation!}
            memoBody={activeBrainSurfaceExplanation?.memoKo ?? null}
            factors={activeBrainSurfaceExplanation?.factorsKo ?? []}
            mediaGuide={activeBrainSurfaceGuide}
            tourStop={null}
            tourStopIndex={0}
            tourStopCount={0}
            primaryAction={{
              label:
                activeBrainSurfaceCandidate?.family === "media"
                  ? copy.globe.contextGuideOpenVideo
                  : copy.globe.contextGuideOpenPage,
              onClick: handleBrainSurfacePrimaryAction,
            }}
            secondaryAction={
              activeBrainSurfaceNode?.kind === "ghost"
                ? {
                    label: copy.globe.contextBrainConnectCta,
                    onClick: handleBrainSurfaceConnect,
                  }
                : activeBrainSurfaceCandidate?.mapsUrl
                  ? {
                      label: copy.globe.contextBrainNodeMapCta,
                      onClick: () =>
                        window.open(
                          activeBrainSurfaceCandidate.mapsUrl!,
                          "_blank",
                          "noopener,noreferrer",
                        ),
                    }
                  : null
            }
            onClose={dismissBrainSurfacePreview}
          />
        </GlobeBrainSurfaceFloatingFrame>
      ) : null}
      </div>
      <GlobeResourceReelStage
        globeRef={globeRef}
        contextEventId={hubEventId}
        lat={liveLocation?.lat ?? null}
        lng={liveLocation?.lng ?? null}
      />
      <GlobeIntelligentDiscoveryStage
        globeRef={globeRef}
        contextEventId={hubEventId}
      />
      <ContextWorkspaceShell
        contextEventId={hubEventId}
        projectTitleKo={
          activeCluster?.placeLabel?.trim() ||
          activeCluster?.title?.trim() ||
          null
        }
      />
      <WorkspaceSdkHost contextEventId={hubEventId} />
      <GlobePlaceMapYoutubeStage globeRef={globeRef} />
      <GlobeTrendBridgeLayer
        visible={trendBridgeLayerActive && !globeRenderSuspended}
        bridgeId={trendBridgeSettings.activeBridgeId}
        anchorLat={trendBridgeAnchorLat}
        anchorLng={trendBridgeAnchorLng}
        zones={trendBridgeRollup.zones}
        contextSummary={trendBridgeRollup.contextSummary}
        peakHour={trendBridgeRollup.peakHour}
        dataSource={trendBridgeRollup.source}
      />
      <GlobeContextStackPicker
        clusters={stackClusters ?? []}
        visible={Boolean(
          stackClusters &&
            stackClusters.length > 0 &&
            (contextAgentSession.phase === "arming"
              ? true
              : stackClusters.length > 1),
        )}
        agentPickMode={contextAgentSession.phase === "arming"}
        onSelect={onStackSelect}
        onDismiss={() => {
          if (readGlobeContextAgentSession().phase === "arming") {
            cancelGlobeContextAgentArm();
            setStackClusters(null);
            return;
          }
          clearActiveContext();
        }}
        onShowAll={() => {
          setStackClusters(null);
          setListOpen(true);
        }}
      />
      <GlobeContextMapVideoStage
        globeRef={globeRef}
        eventId={activeCluster?.eventId ?? null}
        anchorLat={activeCluster?.lat ?? null}
        anchorLng={activeCluster?.lng ?? null}
        visible={showMapVideoReplay}
        navigationEntries={navigableContexts}
        onDismiss={dismissMapMediaReplay}
        onOpenDetails={openMapMediaBridge}
        onHeroPress={openMapMediaBridge}
        onNavigateContext={(nextEventId) => {
          focusContextByEventId(nextEventId);
        }}
        viewerUserId={user?.id}
        deletable={bridgeMediaDeletable}
        onMediaDeleted={() => {
          setMediaStoreRevision((value) => value + 1);
          toast.success("삭제했어요");
        }}
        onPlaybackActiveChange={setMapVideoPlaying}
      />
      {spatialTraceTourRunning &&
      spatialTraceTourActiveStop &&
      !brainSurfaceVisible &&
      !showBrainSurfacePreviewChrome &&
      !showBrainSurfaceDetailChrome &&
      !showMapVideoReplay &&
      !activeBrainSurfaceCandidate?.embedUrl ? (
        <GlobeSpatialTraceTourChip
          stop={spatialTraceTourActiveStop}
          stopIndex={spatialTraceTourStopIndex}
          stopCount={spatialTraceTourStopCount}
          onSkip={dismissBrainSurfacePreview}
          className="bottom-[calc(var(--rimvio-globe-ingest-offset,5.5rem)+0.75rem)]"
        />
      ) : null}
      {mapMediaReplaySuppressed &&
      contextHasMapMedia &&
      !sheetOpen &&
      !mapMediaFocusOpen &&
      !brainProjectionVisible &&
      !brainSurfaceVisible &&
      !confirmOpen &&
      !contextAgentSurfacesActive &&
      activeCluster?.eventId ? (
        <button
          type="button"
          className="pointer-events-auto absolute left-1/2 z-[19] -translate-x-1/2 rounded-full bg-[#0f172a]/78 px-4 py-2 text-[12px] font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)] backdrop-blur-xl ring-1 ring-white/12 active:scale-[0.98]"
          style={{
            bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.75rem)",
          }}
          data-globe-context-guide-replay-chip
          onClick={() => {
            setMapMediaReplayDismissedEventId(null);
            setContextTapPhase("media_open");
          }}
        >
          {copy.globe.contextGuideReplayChip}
        </button>
      ) : null}
      {contextAgentSession.phase === "arming" &&
      layerMode === "personal" &&
      !mapMediaFocusOpen ? (
        <p
          className="pointer-events-none absolute inset-x-6 z-[19] text-center text-[11px] font-medium text-[#9fd0ff] drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]"
          style={{
            top: "max(3.75rem, calc(env(safe-area-inset-top) + 2.75rem))",
          }}
          data-globe-context-agent-arming-hint
        >
          {stackClusters && stackClusters.length > 1
            ? copy.globe.contextAgentStackPickSubtitle
            : copy.globe.contextAgentArmingGlobeHint}
        </p>
      ) : null}
      {contextTapPhase === "awaiting_replay" &&
      hubEventId &&
      !contextHasMapMedia &&
      !sheetOpen &&
      !mapMediaFocusOpen &&
      !confirmOpen &&
      !showBrainSurfacePreviewChrome &&
      !contextAgentSurfacesActive ? (
        <p
          className="pointer-events-none absolute inset-x-6 z-[19] text-center text-[11px] font-medium text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]"
          style={{
            bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.75rem)",
          }}
          data-globe-context-map-tap-hint
        >
          {copy.globe.contextMapTapOpenHint}
        </p>
      ) : null}
      <GlobeContextConditionPromptFrame
        open={contextConditionPromptOpen && !fieldSheetOpen}
        event={contextConditionPanelEvent}
        operatorBlueprint={realitySurfaceSession?.operatorBlueprint ?? null}
        destinationConfirmed={Boolean(
          realitySurfaceSession?.operatorBlueprint &&
            !blueprintNeedsDestination(realitySurfaceSession.operatorBlueprint),
        )}
        anchorPlaceId={`context-center:${contextConditionPanelEvent?.id ?? "unknown"}`}
        anchorPlaceName={
          contextAgentPanelCluster?.placeLabel?.trim() ||
          contextConditionPanelEvent?.place?.trim() ||
          contextConditionPanelEvent?.title.trim() ||
          copy.globe.contextConditionPanelEyebrow
        }
        anchorLat={contextConditionPromptLat}
        anchorLng={contextConditionPromptLng}
        userLat={promptUserLat}
        userLng={promptUserLng}
        globeRef={globeRef}
        onClose={dismissContextAgentPanel}
      />
      <GlobeContextAgentConnector
        visible={
          contextConditionPromptOpen &&
          contextAgentSession.phase === "bound" &&
          !discoveryFeedFocus
        }
        globeRef={globeRef}
        pinLat={contextConditionPanelCoords?.lat ?? null}
        pinLng={contextConditionPanelCoords?.lng ?? null}
      />
      <GlobeHomeLeftChrome
        mapMediaFocusOpen={mapMediaFocusOpen}
        layerMode={layerMode}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        peopleFilter={peopleFilter}
        onPeopleFilterChange={setPeopleFilter}
        peerOptions={peerOptions}
        onCreatePhoto={openPhotoPicker}
        onOpenList={() => setListOpen(true)}
        onOpenManage={() => setManageOpen(true)}
        onSelectContext={previewContextEntry}
        onAgentContextPick={bindContextAgentToEntry}
        contextAgentArming={contextAgentSession.phase === "arming"}
        onContextAgentBind={
          hubEventId
            ? () => {
                if (
                  contextAgentSession.phase === "bound" &&
                  contextAgentSession.boundEventId === hubEventId
                ) {
                  dismissCompetingGlobeSurfaces();
                  openGlobeContextConditionPanel(hubEventId);
                  return;
                }
                void bindContextAgentToEventId(hubEventId);
              }
            : undefined
        }
        onToggleContextAgentArm={
          layerMode === "personal" && !mapMediaFocusOpen
            ? toggleContextAgentArm
            : undefined
        }
        onContextsDeleted={handleContextsDeleted}
        onNewContext={() => setPortalOpen(true)}
        onPortalPeekToggle={togglePortalPeek}
        inboxCount={globeInboxCount}
        mediaPoolCount={mediaPoolCount}
        marketManageCount={marketManageCount}
        workQueueCount={workQueueItems.length}
        onOpenInbox={() => setGlobeInboxOpen(true)}
        onOpenMediaPool={() => setMediaPoolOpen(true)}
        onOpenMarketManage={
          marketManageCount > 0
            ? () => openFieldDashboardIngress({ tab: "mine" })
            : undefined
        }
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenWorkQueue={() => setWorkQueueOpen(true)}
        liveLat={liveLocation?.lat ?? null}
        liveLng={liveLocation?.lng ?? null}
        globeRef={globeRef}
        hubEventId={hubEventId}
        hubDetailOpen={hubDetailOpen}
        suppressMapHubRail={suppressMapHubRail}
        suppressBrainStrip={brainSurfaceVisible}
        globeRenderSuspended={globeRenderSuspended}
        authUserId={user?.id ?? null}
        operatorBlueprint={
          realitySurfaceSession?.eventId === hubEventId
            ? realitySurfaceSession.operatorBlueprint
            : null
        }
        executionPlan={
          realitySurfaceSession?.eventId === hubEventId
            ? realitySurfaceSession.executionPlan ?? null
            : null
        }
        onApproveExecutionPlan={
          realitySurfaceSession?.eventId === hubEventId
            ? () => {
                approveExecutionPlan();
              }
            : undefined
        }
        trendBridge={{
          enabled: trendBridgeSettings.enabled,
          activeBridgeId: trendBridgeSettings.activeBridgeId,
          pulseIntent: trendBridgeSettings.pulseIntent,
          onToggle: onTrendBridgeModeChange,
          onBridgeSelect: onTrendBridgeSelect,
          onPulseIntentChange: onTrendBridgePulseIntentChange,
        }}
      />
      <GlobeContextHubDetailSheet
        open={hubDetailOpen}
        onOpenChange={setHubDetailOpen}
        activeEventId={hubEventId}
        lat={liveLocation?.lat ?? null}
        lng={liveLocation?.lng ?? null}
        authUserId={user?.id ?? null}
        visible={Boolean(hubEventId)}
        operatorBlueprint={
          realitySurfaceSession?.eventId === hubEventId
            ? realitySurfaceSession.operatorBlueprint
            : null
        }
        executionPlan={
          realitySurfaceSession?.eventId === hubEventId
            ? realitySurfaceSession.executionPlan ?? null
            : null
        }
        onApproveExecutionPlan={
          realitySurfaceSession?.eventId === hubEventId
            ? () => {
                approveExecutionPlan();
              }
            : undefined
        }
        globeRef={globeRef}
      />
      {/* —— Overlay chrome (priority strip) —— */}
      {!mapMediaFocusOpen && layerMode === "personal" && !confirmOpen && !sheetOpen ? (
        <div className="pointer-events-none absolute inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-20 flex justify-center px-6">
          <div className="flex w-full max-w-[22rem] flex-col items-center gap-2">
            {suppressGlobePriorityChrome ? (
              <GlobeThreeFloorsStrip
                stage={threeFloorsStage}
                surfaceMode={rimvioUxSurfaceMode}
                closureLine={
                  showBrainSurfaceOntologyPeek ? brainSurfaceClosureLine : null
                }
              />
            ) : (
              <>
                <GlobePriorityStrip
                  payload={priorityPayload}
                  onMainAction={onPriorityMainAction}
                  onLearnChoice={choosePriorityLearn}
                  onLearnLater={dismissPriorityLearn}
                  onOpenQueue={() => setWorkQueueOpen(true)}
                />
                <GlobeRealitySurfaceStrip projection={visibleRealitySurfaceProjection} />
                <div className="pointer-events-auto flex w-full justify-center">
                  <GlobeMorningPrepOverlay />
                </div>
                <div className="pointer-events-auto flex w-full justify-center">
                  <GlobeEventHorizonPushOverlay />
                </div>
                <div className="pointer-events-auto flex w-full justify-center">
                  <GlobeFactProjectionOverlay
                    onFlyTo={({ lat, lng }) => {
                      globeRef.current?.flyToPin(lat, lng, "street", {
                        pinViewportY: 0.55,
                      });
                    }}
                  />
                </div>
                <div className="pointer-events-auto flex w-full justify-center">
                  <GlobeHomeRecallOneLiner />
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
      {!mapMediaFocusOpen ? (
      <>
      {/* —— L2 Capture dock (compose · ingest) —— */}
      <GlobeCaptureDock
        ref={ingestBarRef}
        composeHidden={
          portalOpen ||
          marketConfirmOpen ||
          brainProjectionVisible ||
          contextConditionPromptOpen ||
          globeChatOpen
        }
        suppressMapIntentPills={Boolean(tripSituationRouter)}
        stackAboveCompose={
          <>
            {pulseMainActionEnabled ? (
              <MarketAlignmentSummary
                enabled={pulseMainActionEnabled}
                focusEventId={marketFocusEventId ?? activeCluster?.eventId ?? null}
              />
            ) : null}
            {!confirmOpen && !sheetOpen && layerMode === "personal" ? (
              <GlobeHomeMemoryRecallPanel />
            ) : null}
            {!confirmOpen && !sheetOpen && layerMode === "personal" ? (
              <GlobePortalIntentPeekPanel
                open={portalPeekOpen}
                onSelectIntent={onPortalIntentPeekSelect}
              />
            ) : null}
          </>
        }
        photoFlow={{
          open: confirmOpen,
          preparing: confirmPreparing,
          error: confirmError,
          draft: confirmDraft,
          fileProgress: photoFileProgress,
          attachTarget: activeCluster?.eventId
            ? {
                eventId: activeCluster.eventId,
                title: activeCluster.title,
                force: true,
              }
            : null,
          onDismiss: resetPhotoIngestFlow,
          onCommitProgress: (done, total) => {
            setPhotoFileProgress((rows) => {
              const next = rows.map((row, index) => {
                if (row.status === "error") {
                  return row;
                }
                if (index < done) {
                  return { ...row, status: "done" as const };
                }
                if (index === done && done < total) {
                  return { ...row, status: "committing" as const };
                }
                return row;
              });
              photoFileProgressRef.current = next;
              return next;
            });
          },
          onCommitFileIndexProgress: handleCommitFileIndexProgress,
          onRetryFile: (fileIndex) => {
            void handleRetryPhotoFile(fileIndex);
          },
          retryingFileIndex: photoRetryingIndex,
          onConfirmed: ({
            eventId,
            toastLine,
            needsPlaceVerify,
            ok = true,
            undoPayload,
            knowledgePlacementPending: walkthroughPending,
          }) => {
            if (ok === false) {
              toast.error(toastLine);
              return;
            }
            if (undoPayload) {
              stashPhotoIngestUndo(undoPayload);
              setPhotoUndoPayload(undoPayload);
            }
            const hasRetryableErrors = photoFileProgressRef.current.some(
              (row) => row.status === "error",
            );
            if (!hasRetryableErrors) {
              resetPhotoIngestFlow();
            }
            setMediaStoreRevision((value) => value + 1);
            toast.success(copy.globe.memoriesFootprintSaved(rimvioHonorific));
            if (walkthroughPending) {
              setKnowledgePlacementPending(walkthroughPending);
            }
            if (eventId) {
              if (trendBridgeSettings.enabled) {
                void submitTrendBridgeContributionFromEvent({ eventId }).then(() => {
                  toast.message(copy.globe.memoriesContributionPulse(rimvioHonorific), {
                    duration: 3600,
                  });
                });
              }
              void focusContextOnMap(eventId, { needsPlaceVerify });
            }
          },
        }}
        placeVerifyEventId={placeVerifyEventId}
        onPlaceVerifyDismiss={() => setPlaceVerifyEventId(null)}
        onPlaceVerifyConfirmed={() => {
          toast.success(copy.globe.placeVerifyConfirmedToast);
        }}
        knowledgePlacementPending={knowledgePlacementPending}
        onKnowledgePlacementDismiss={onKnowledgePlacementDismiss}
        onKnowledgePlacementConfirmed={onKnowledgePlacementConfirmed}
        ingest={{
          targetEventId:
            contextAgentBoundEventId ??
            activeCluster?.eventId ??
            realitySurfaceEventId ??
            null,
          targetTitle:
            contextAgentPanelCluster?.title ??
            activeCluster?.title ??
            null,
          forceAttachToTarget: false,
          onPhotoDraftReady: beginPhotoIngestFlow,
          onAttached: (eventId, options) => {
            const params = new URLSearchParams(window.location.search);
            if (params.get("recallEvent") !== eventId) {
              params.set("recallEvent", eventId);
              const next = `${window.location.pathname}?${params.toString()}`;
              window.history.replaceState(null, "", next);
            }
            void focusContextOnMap(eventId, options);
          },
          userLat: liveLocation?.lat ?? null,
          userLng: liveLocation?.lng ?? null,
          onLodgingDiscovery: ({ eventId }) => {
            void focusContextOnMap(eventId);
          },
          onEateryDiscovery: ({ eventId }) => {
            void focusContextOnMap(eventId);
          },
          onOpenPortal: (input) => {
            void openPortal({
              eventId: input.eventId,
              composeText: input.composeText,
              source: "composer",
            });
          },
          onQuickListMarket: (input) => quickListMarket(input),
          onLaunchMarketProjection: ({ draft, eventId, composeText }) => {
            launchMarketProjection({ draft, eventId });
            setPortalComposeText(composeText);
          },
          onMarketComposeFeedReady: onMarketComposeFeedReady,
          onOpenMarketManage: () => openFieldDashboardIngress({ tab: "mine" }),
          marketRoleBusy: marketTradeBusy,
          layerMode,
          onDiscoveryMarketBrowse,
          onComposeFocus: () => {
            memoryRecallComposeRef.current?.onFocus();
          },
          onComposeBlur: () => memoryRecallComposeRef.current?.onBlur(),
          onComposeOpen: openGlobeChat,
          onWorkSurfaceClassified: handleWorkSurfaceClassified,
          onWorkQueueChanged: refreshWorkQueue,
          onKnowledgePlacementPending,
          onGlobeIngressCompiled,
          onIngressConvergeAttachFocus: (eventId) => {
            openContextByEventId(eventId);
          },
          gateOperatorBeforeDispatch,
          tryAdvanceDestinationFromMessage: handleTryAdvanceDestinationFromMessage,
          onOperatorDestinationChoice,
          tripSituationRouter,
          onTripSituationSelect,
        }}
      />
      <GlobeWorkQueueSheet
        items={workQueueItems}
        open={workQueueOpen}
        onOpenChange={setWorkQueueOpen}
        onResume={resumeWorkQueueItem}
        onDismiss={dismissWorkQueueItem}
      />
      <GlobeTicketQrViewer
        open={priorityQrOpen}
        onOpenChange={setPriorityQrOpen}
        qrSrc={priorityQrSrc}
        title={priorityQrTitle}
      />
      <GlobeChatScreen
        open={
          globeChatOpen &&
          !portalOpen &&
          !marketConfirmOpen &&
          !contextConditionPromptOpen
        }
        onClose={() => setGlobeChatOpen(false)}
        onArtifactPrimaryAction={() => void runPendingMarketComposeAction()}
        onArtifactSecondaryAction={() => void runComposeDetailSlotFill()}
        onViewInnerGlobe={focusResourceOnInnerGlobe}
        onViewOuterGlobe={focusResourceOnOuterGlobe}
        ingest={{
          targetEventId:
            contextAgentBoundEventId ??
            activeCluster?.eventId ??
            realitySurfaceEventId ??
            null,
          targetTitle:
            contextAgentPanelCluster?.title ??
            activeCluster?.title ??
            null,
          forceAttachToTarget: false,
          onPhotoDraftReady: beginPhotoIngestFlow,
          onAttached: (eventId, options) => {
            const params = new URLSearchParams(window.location.search);
            if (params.get("recallEvent") !== eventId) {
              params.set("recallEvent", eventId);
              const next = `${window.location.pathname}?${params.toString()}`;
              window.history.replaceState(null, "", next);
            }
            void focusContextOnMap(eventId, options);
          },
          userLat: liveLocation?.lat ?? null,
          userLng: liveLocation?.lng ?? null,
          onLodgingDiscovery: ({ eventId }) => {
            void focusContextOnMap(eventId);
          },
          onEateryDiscovery: ({ eventId }) => {
            void focusContextOnMap(eventId);
          },
          onOpenPortal: (input) => {
            void openPortal({
              eventId: input.eventId,
              composeText: input.composeText,
              source: "composer",
            });
          },
          onQuickListMarket: (input) => quickListMarket(input),
          onLaunchMarketProjection: ({ draft, eventId, composeText }) => {
            launchMarketProjection({ draft, eventId });
            setPortalComposeText(composeText);
          },
          onMarketComposeFeedReady: onMarketComposeFeedReady,
          onOpenMarketManage: () => openFieldDashboardIngress({ tab: "mine" }),
          marketRoleBusy: marketTradeBusy,
          layerMode,
          onDiscoveryMarketBrowse,
          onComposeFocus: () => memoryRecallComposeRef.current?.onFocus(),
          onComposeBlur: () => memoryRecallComposeRef.current?.onBlur(),
          onWorkSurfaceClassified: handleWorkSurfaceClassified,
          onWorkQueueChanged: refreshWorkQueue,
          onKnowledgePlacementPending,
          onGlobeIngressCompiled,
          onIngressConvergeAttachFocus: (eventId) => {
            openContextByEventId(eventId);
          },
          gateOperatorBeforeDispatch,
          tryAdvanceDestinationFromMessage: handleTryAdvanceDestinationFromMessage,
          onOperatorDestinationChoice,
          tripSituationRouter,
          onTripSituationSelect,
        }}
      />
      </>
      ) : null}
      <GlobeMediaPoolSheet
        open={mediaPoolOpen}
        onOpenChange={setMediaPoolOpen}
        activeContextTitle={activeCluster?.title ?? null}
        onAttachToActive={
          activeCluster?.eventId
            ? async (contextIds) => {
                const summary = await attachPoolMediaBatch({
                  contextIds,
                  eventId: activeCluster.eventId,
                  hintTitle: activeCluster.title,
                });
                toast.success(summary.toastLine);
                setMediaStoreRevision((revision) => revision + 1);
                void focusContextOnMap(activeCluster.eventId);
              }
            : undefined
        }
        onCreateContext={({ contextIds, startIso }) => {
          setPoolAttachIds(contextIds);
          setPoolSuggestedStart(startIso);
          setCreateOpen(true);
        }}
      />
      <GlobeInboxSheet
        open={globeInboxOpen}
        onOpenChange={setGlobeInboxOpen}
        notifications={globeNotifications}
        needsLogin={globeInboxNeedsLogin}
        loadError={globeInboxError}
        onBridgeAccepted={(eventId) => {
          dismissInvite(eventId);
          void refreshBridgeInvites();
          setGlobeInboxOpen(false);
          focusContextByEventId(eventId, { openSheet: true });
        }}
        onBridgeDeclined={(eventId) => {
          dismissInvite(eventId);
          void refreshBridgeInvites();
        }}
        onNotificationDismissed={dismissNotification}
        onLocationConfirmed={() => {
          refreshGlobeInboxData();
        }}
      />
      <PinOpenSheet
        open={sheetOpen && shouldOpenGlobeBridgeSheet()}
        onOpenChange={onSheetOpenChange}
        cluster={activeCluster}
        initialPage={pinSheetInitialPage}
        onOpenDetail={() => {
          if (activeCluster) {
            globeRef.current?.flyToPin(
              activeCluster.lat,
              activeCluster.lng,
              "pin",
            );
          }
        }}
      />
      <input
        ref={createPhotoRef}
        type="file"
        accept={GLOBE_CONTEXT_MEDIA_ACCEPT}
        multiple
        className="sr-only"
        aria-hidden
        onChange={(event) => {
          const files = event.target.files ? Array.from(event.target.files) : [];
          event.target.value = "";
          if (files.length > 0) {
            dispatchGlobeHomePhotoWalkthrough(files);
          }
        }}
      />
      <GlobeCreateContextSheet
        open={createOpen}
        initialStartIso={poolSuggestedStart}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setPoolAttachIds([]);
            setPoolSuggestedStart(null);
          }
        }}
        onCreated={({ event }) => {
          const pendingIds = [...poolAttachIds];
          setPoolAttachIds([]);
          setPoolSuggestedStart(null);
          if (pendingIds.length > 0) {
            void attachPoolMediaBatch({
              contextIds: pendingIds,
              eventId: event.id,
              hintTitle: event.title,
            }).then((summary) => {
              toast.success(summary.toastLine);
              setMediaStoreRevision((revision) => revision + 1);
            });
          }
          openContextByEventId(event.id);
        }}
      />
      <GlobeContextListSheet
        open={listOpen}
        onOpenChange={setListOpen}
        onSelect={openContextEntry}
      />
      <GlobeContextManageSheet
        open={manageOpen}
        onOpenChange={setManageOpen}
        onOpenContext={openProjectedContext}
        onDeleted={handleContextsDeleted}
      />
      <ExperienceBridgeGhostSheet
        open={bridgeGhostOpen}
        onOpenChange={setBridgeGhostOpen}
        invite={bridgeGhostInvite}
        cluster={bridgeGhostCluster}
        onAccepted={(eventId) => {
          dismissInvite(eventId);
          void refreshBridgeInvites();
          focusContextByEventId(eventId, { openSheet: true });
        }}
        onDismissed={dismissInvite}
      />
      <RimvioPortalSheet
        open={portalOpen}
        onOpenChange={(next) => {
          setPortalOpen(next);
          if (!next) {
            setPortalInitialIntentId(null);
          }
        }}
        event={portalEvent}
        composeText={portalComposeText}
        source={portalSource}
        initialIntentId={portalInitialIntentId}
        liveLat={liveLocation?.lat ?? null}
        liveLng={liveLocation?.lng ?? null}
        onLaunchMarketProjection={launchMarketProjection}
      />
      <GlobeMarketIntentWizardSheet
        draft={marketIntentDraft}
        open={marketConfirmOpen}
        startStep={marketWizardStartStep}
        portalLaunch={marketPortalLaunch}
        feedComposeText={portalComposeText}
        onOpenChange={(open) => {
          setMarketConfirmOpen(open);
          if (!open) {
            setMarketWizardStartStep(undefined);
            setMarketPortalLaunch(false);
          }
        }}
        onConfirmed={({ eventId, role, lat, lng, placeLabel }) => {
          finishContextRun();
          setMarketFocusEventId(eventId);
          setMarketIntentRevision((value) => value + 1);
          globeRef.current?.flyToPin(lat, lng, "street", { pinViewportY: 0.58 });
          focusContextByEventId(eventId, { openSheet: false });
          toast.success(
            role === "listing"
              ? copy.globe.marketPinPlacedListing(placeLabel)
              : copy.globe.marketPinPlacedSeeking(placeLabel),
          );
        }}
      />
      <GlobeLodgingCheckoutHost />
      <GlobeSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onShowGlobeGuide={() => {
          setSettingsOpen(false);
          setGlobeGuideOpen(true);
        }}
      />
      <MyProfileSheet
        open={identityProfileOpen}
        onOpenChange={(open) => {
          setIdentityProfileOpen(open);
          if (!open) {
            setIdentityVaultFocus(false);
            setPaymentVaultFocus(false);
          }
        }}
        identityVaultFocus={identityVaultFocus}
        paymentVaultFocus={paymentVaultFocus}
      />
      <PersonalGlobeSheet
        open={personalGlobeOpen}
        onOpenChange={setPersonalGlobeOpen}
        viewer={{ isOwner: true }}
      />
      <GlobeContextShareSheet
        open={shareSheetOpen}
        onOpenChange={setShareSheetOpen}
        eventId={shareEventId}
        onShared={() => {
          void refreshBridgeInvites();
        }}
      />
      <GlobeFirstVisitCoach
        open={globeGuideOpen || undefined}
        onOpenChange={setGlobeGuideOpen}
        onAddPhoto={() => ingestBarRef.current?.openPhotoPicker()}
      />
      <AnimatePresence>
        {photoUndoPayload ? (
          <GlobePhotoIngestUndoBar
            headline={photoUndoPayload.headline}
            onUndo={() => {
              undoGlobePhotoIngest(photoUndoPayload);
              setPhotoUndoPayload(null);
              setMediaStoreRevision((value) => value + 1);
              toast.message(copy.globe.photoIngestUndone);
            }}
            onExpire={() => setPhotoUndoPayload(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
    </GlobeHomeMemoryRecallProvider>
  );
}

/** Globe-first home — pins only, tap → replay. */
export function GlobeHomeClient() {
  return (
    <Suspense
      fallback={
        <div
          className="relative h-dvh w-full bg-[#0b1220]"
          data-rimvio-globe-hub-loading
          aria-busy
        />
      }
    >
      <GlobeHomeBody />
    </Suspense>
  );
}
