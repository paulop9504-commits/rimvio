"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { RimvioGlobeHubClient } from "@/components/experience/rimvio-globe-hub-client";
import { GlobeContextControlDock } from "@/components/globe/globe-context-control-dock";
import { GlobeLayerModeToggle } from "@/components/globe/globe-layer-mode-toggle";
import { GlobeContextHubRail } from "@/components/globe/globe-context-hub-rail";
import { GlobeContextHubDetailSheet } from "@/components/globe/globe-context-hub-detail-sheet";
import { GlobeUtilityMenu } from "@/components/globe/globe-utility-menu";
import { GlobeContextMapVideoStage } from "@/components/globe/globe-context-map-video-stage";
import { GlobeLodgingFocusStage } from "@/components/globe/globe-lodging-focus-stage";
import { GlobeCaptureDock } from "@/components/globe/globe-capture-dock";
import { GlobeComposeAccessoryBar } from "@/components/globe/globe-compose-accessory-bar";
import {
  GlobeHomeMemoryRecallPanel,
  GlobeHomeMemoryRecallProvider,
  GlobeHomeMemoryRecallToggleAnchor,
} from "@/components/globe/globe-home-memory-dock";
import { GlobePortalIntentPeekPanel } from "@/components/globe/globe-portal-intent-peek";
import { GlobePhotoIngestUndoBar } from "@/components/globe/globe-photo-ingest-undo-bar";
import { GlobeTrendBridgePulseChip } from "@/components/globe/globe-trend-bridge-pulse-chip";
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
import { PinOpenSheet } from "@/components/globe/pin-open-sheet";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { subscribeGlobeMapMediaFocus } from "@/lib/globe/globe-map-media-focus-bridge";
import { subscribeGlobePhotoIngest } from "@/lib/globe/globe-photo-ingest-bridge";
import { setLiveLocationPowerMode } from "@/lib/location-ping/live-location-service";
import { usePersonalGlobePinSync } from "@/hooks/use-personal-globe-pin-sync";
import { useGlobeLayerMode } from "@/hooks/use-globe-layer-mode";
import { useFieldSheet } from "@/components/field/field-sheet-provider";
import { useOpportunityFieldBadge } from "@/hooks/use-opportunity-field-badge";
import { subscribeFieldSheetOpenState } from "@/lib/nav/field-sheet-bridge";
import { useIosPwaMemoryGuards } from "@/hooks/use-ios-pwa-memory-guards";
import {
  iosPwaDiscoveryPinsDelayMs,
} from "@/lib/platform/ios-pwa-memory";
import { useGlobeInbox } from "@/hooks/use-globe-inbox";
import { useMediaPool } from "@/hooks/use-media-pool";
import { useGlobeTripArrival } from "@/hooks/use-globe-trip-arrival";
import { useTrendBridge } from "@/hooks/use-trend-bridge";
import { useTrendBridgeRollup } from "@/hooks/use-trend-bridge-rollup";
import { useGlobeContextPlaceAlignment } from "@/hooks/use-globe-context-place-alignment";
import { useBridgeMediaSync } from "@/hooks/use-bridge-media-sync";
import { useAuth } from "@/hooks/use-auth";
import { isBridgeLinkedEventId } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { focusGlobeContextOnMap } from "@/lib/globe/focus-globe-context-on-map";
import {
  canOfferGlobeLocationPrompt,
  markGlobeLocationPromptOffered,
} from "@/lib/globe/globe-location-prompt-budget";
import { runSilentPassiveLocationResolves } from "@/lib/globe/passive-context/run-silent-passive-location-resolves";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { attachPoolMediaBatch } from "@/lib/media-pool/attach-pool-media-to-event";
import {
  revertGlobeContextPinToCardPlace,
  resolveGlobeContextCardPinCluster,
} from "@/lib/globe/globe-context-card-coords";
import type { GlobeContextTimeFilter } from "@/lib/globe/globe-context-time-filter";
import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";
import {
  globeContextTapHitRadiusMeters,
  resolveGlobeContextsNearTap,
} from "@/lib/globe/resolve-globe-contexts-near-tap";
import type { GlobeContextTimelineEntry } from "@/lib/globe/list-globe-context-timeline";
import type { GlobeManageContextEntry } from "@/lib/globe/list-globe-manage-contexts";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
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
import { resolveRimvioHonorific } from "@/lib/copy/rimvio-honorific";
import { getTrendBridgeFeature } from "@/lib/globe/trend-bridge/trend-bridge-feature-registry";
import { findMarketIntentByEventId } from "@/lib/globe/market/market-alignment-store";
import { MarketAlignmentSurface } from "@/components/market/market-alignment-surface";
import { GlobeMarketManageSheet } from "@/components/market/globe-market-manage-sheet";
import { GlobeMarketIntentWizardSheet } from "@/components/globe/globe-market-intent-wizard-sheet";
import {
  listActiveMarketIntents,
  subscribeMarketIntents,
} from "@/lib/globe/market/market-alignment-store";
import { ingestGlobeContextFromText } from "@/lib/feed/ingest-globe-context-capture";
import { commitMarketIntentQuickList } from "@/lib/globe/market/commit-market-intent-quick-list";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import type { MarketWizardStepId } from "@/lib/globe/market/market-intent-wizard-flow";
import { submitTrendBridgeContributionFromEvent } from "@/lib/globe/trend-bridge/client/submit-trend-bridge-contribution";
import { subscribeGlobeContextHubOpen } from "@/lib/globe/context-hub/globe-context-hub-open-bridge";
import { subscribeGlobeAskBridgeFocus } from "@/lib/globe/globe-ask-bridge-focus";
import { RimvioPortalSheet } from "@/components/portal/rimvio-portal-sheet";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { PortalOpenSource } from "@/lib/portal/portal-types";
import type { PortalIntentId } from "@/lib/portal/portal-types";
import { subscribeGlobePortalOpen } from "@/lib/portal/globe-portal-open-bridge";
import { isExternalPinCluster } from "@/lib/globe/merge-globe-pin-clusters";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import { projectBridgeGhostClusters } from "@/lib/experience-bridge/project-bridge-ghost-clusters";
import type { PendingBridgeInvite } from "@/hooks/use-pending-bridge-invites";

const PIN_REVERT_MS = 1_100;
/** Pin tap and globe click fire together — ignore the follow-up globe press. */
const GLOBE_PIN_PRESS_SUPPRESS_MS = 900;

function GlobeHomeBody() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const rimvioHonorific = resolveRimvioHonorific(user);
  const recallEventId = searchParams.get("recallEvent");
  const globeRef = useRef<RimvioGlobeHubHandle>(null);
  const ingestBarRef = useRef<GlobeContextIngestBarHandle>(null);
  const memoryRecallComposeRef = useRef<{
    onFocus: () => void;
    onBlur: () => void;
  } | null>(null);
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
  const [portalEvent, setPortalEvent] = useState<EventCandidate | null>(null);
  const [portalComposeText, setPortalComposeText] = useState<string | undefined>();
  const [portalSource, setPortalSource] = useState<PortalOpenSource>("composer");
  const [portalInitialIntentId, setPortalInitialIntentId] = useState<PortalIntentId | null>(
    null,
  );
  const [marketTradeBusy, setMarketTradeBusy] = useState(false);
  const [marketFocusEventId, setMarketFocusEventId] = useState<string | null>(null);
  const [marketManageOpen, setMarketManageOpen] = useState(false);
  const [marketIntentRevision, setMarketIntentRevision] = useState(0);
  const liveLocation = useLiveLocationSnapshot();
  useEffect(
    () => subscribeMarketIntents(() => setMarketIntentRevision((value) => value + 1)),
    [],
  );
  const marketManageCount = useMemo(() => {
    void marketIntentRevision;
    return listActiveMarketIntents().length;
  }, [marketIntentRevision]);
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
  const { open: fieldSheetOpen, openFieldSheet } = useFieldSheet();
  const [fieldSheetSignalOpen, setFieldSheetSignalOpen] = useState(false);
  useEffect(() => {
    return subscribeFieldSheetOpenState(setFieldSheetSignalOpen);
  }, []);
  const fieldOverlayOpen = fieldSheetOpen || fieldSheetSignalOpen;
  const [layerSwitchSuspend, setLayerSwitchSuspend] = useState(false);
  const iosPwaGuards = useIosPwaMemoryGuards();
  const [discoveryBadgeReady, setDiscoveryBadgeReady] = useState(false);
  const [mediaPoolOpen, setMediaPoolOpen] = useState(false);
  const [poolAttachIds, setPoolAttachIds] = useState<string[]>([]);
  const [poolSuggestedStart, setPoolSuggestedStart] = useState<string | null>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareEventId, setShareEventId] = useState<string | null>(null);
  const [activeCluster, setActiveCluster] = useState<PinCluster | null>(null);
  useEffect(() => {
    if (!iosPwaGuards) {
      setDiscoveryBadgeReady(layerMode === "discovery");
      return;
    }
    if (layerMode !== "discovery") {
      setDiscoveryBadgeReady(false);
      return;
    }
    setDiscoveryBadgeReady(false);
    const timer = window.setTimeout(
      () => setDiscoveryBadgeReady(true),
      iosPwaDiscoveryPinsDelayMs(),
    );
    return () => window.clearTimeout(timer);
  }, [iosPwaGuards, layerMode]);

  const fieldMatchCount = useOpportunityFieldBadge({
    enabled:
      layerMode === "discovery" && !fieldOverlayOpen && discoveryBadgeReady,
    primaryEventId: activeCluster?.eventId ?? null,
  });
  const [placeVerifyEventId, setPlaceVerifyEventId] = useState<string | null>(null);
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
  const [stackClusters, setStackClusters] = useState<PinCluster[] | null>(null);
  const [mediaStoreRevision, setMediaStoreRevision] = useState(0);
  const [hubDetailOpen, setHubDetailOpen] = useState(false);
  const [mapMediaFocusOpen, setMapMediaFocusOpen] = useState(false);
  const [contextTapPhase, setContextTapPhase] =
    useState<ContextMapTapPhase>("awaiting_replay");
  const contextTapPhaseRef = useRef<ContextMapTapPhase>("awaiting_replay");
  const clustersRef = useRef<readonly PinCluster[]>([]);

  useEffect(() => {
    return subscribeGlobeMapMediaFocus((detail) => {
      setMapMediaFocusOpen(detail.open);
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

  const detailLevelRef = useRef<GlobeDetailLevel>("space");
  const lastPinPressAtRef = useRef(0);

  const onClustersSnapshot = useCallback((clusters: readonly PinCluster[]) => {
    clustersRef.current = clusters;
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

  const clearActiveContext = useCallback(() => {
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

  const onLayerModeChange = useCallback(
    (mode: GlobeLayerMode) => {
      if (iosPwaGuards) {
        setLayerSwitchSuspend(true);
        setDiscoveryBadgeReady(false);
        window.setTimeout(() => {
          setLayerSwitchSuspend(false);
          if (mode === "discovery") {
            window.setTimeout(
              () => setDiscoveryBadgeReady(true),
              iosPwaDiscoveryPinsDelayMs(),
            );
          }
        }, 500);
      } else if (mode === "discovery") {
        setDiscoveryBadgeReady(true);
      } else {
        setDiscoveryBadgeReady(false);
      }
      setLayerMode(mode);
      clearActiveContext();
      setHubDetailOpen(false);
      setListOpen(false);
      setManageOpen(false);
      globeRef.current?.resetToOverview();
    },
    [clearActiveContext, iosPwaGuards, setLayerMode],
  );

  const openContextCluster = useCallback(
    (
      cluster: PinCluster,
      options?: {
        openSheet?: boolean;
        mapTap?: boolean;
        sheetPage?: PinOpenInitialPage;
      },
    ) => {
      globeRef.current?.flyToPin(cluster.lat, cluster.lng, "neighborhood");
      setStackClusters(null);
      setActiveCluster(cluster);

      const eventId = cluster.eventId?.trim();
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
        const openSheet = options?.openSheet !== false;
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
        setContextTapPhase("media_open");
      } else {
        openMapMediaBridgeRef.current?.();
      }
      return;
    }

    if (phase === "media_open") {
      setContextTapPhase("awaiting_replay");
      globeRef.current?.clearPinViewportBias();
    }
  }, [clearActiveContext]);

  const markPinPress = useCallback(() => {
    lastPinPressAtRef.current = Date.now();
  }, []);

  const applyNearbyContexts = useCallback(
    (nearby: readonly PinCluster[], flyCluster?: PinCluster | null) => {
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
    return listGlobeContextPeerOptions(listLifeEventCandidates());
  }, [peerOptionsRevision]);

  const activeContextEvent = useMemo(() => {
    const eventId = activeCluster?.eventId?.trim();
    if (!eventId) {
      return null;
    }
    return (
      findLifeEventCandidate(eventId) ?? recoverGlobeContextEventFromPin(eventId)
    );
  }, [activeCluster?.eventId, mediaStoreRevision]);

  const bridgeMediaDeletable = useMemo(() => {
    const id = activeCluster?.eventId?.trim();
    return Boolean(id && isBridgeLinkedEventId(id));
  }, [activeCluster?.eventId]);

  useBridgeMediaSync({
    priorityEventId: activeCluster?.eventId ?? null,
  });

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
    return listGlobeContextNavigationOrder({
      timeFilter,
      peopleFilter,
    });
  }, [peerOptionsRevision, mediaStoreRevision, peopleFilter, timeFilter]);

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

  const showMapVideoReplay = Boolean(
    activeCluster?.eventId &&
      !sheetOpen &&
      !stackClusters?.length &&
      contextMapTapPhaseAllowsMediaReplay(contextTapPhase) &&
      contextHasMapMedia,
  );

  /** Map stays clean while a context is focused — hub lives in the pin sheet. */
  const suppressMapHubRail = Boolean(hubEventId || mapMediaFocusOpen);

  const dismissMapMediaReplay = useCallback(() => {
    setContextTapPhase("awaiting_replay");
    globeRef.current?.clearPinViewportBias();
  }, []);

  useEffect(() => {
    const refresh = () => setPeerOptionsRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, refresh);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, refresh);
    };
  }, []);

  useEffect(() => {
    const bump = () => setMediaStoreRevision((value) => value + 1);
    void hydrateMediaContextStore().then(bump);
    window.addEventListener(MEDIA_SPACETIME_UPDATED, bump);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => {
      window.removeEventListener(MEDIA_SPACETIME_UPDATED, bump);
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
    };
  }, []);

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
      setGlobeMemoryDismissToken((token) => token + 1);
      setPortalPeekOpen(false);
      if (pinDragActiveRef.current) {
        return;
      }
      if (Date.now() - lastPinPressAtRef.current < GLOBE_PIN_PRESS_SUPPRESS_MS) {
        return;
      }
      const nearby = resolveNearbyAt(coords.lat, coords.lng);
      if (nearby.length === 0) {
        clearActiveContext();
        return;
      }
      applyNearbyContexts(nearby);
    },
    [applyNearbyContexts, clearActiveContext, resolveNearbyAt],
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

  openMapMediaBridgeRef.current = openMapMediaBridge;

  const focusContextByEventId = useCallback(
    async (
      eventId: string,
      options?: {
        openSheet?: boolean;
        mapTap?: boolean;
        sheetPage?: PinOpenInitialPage;
      },
    ) => {
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
  focusContextByEventIdRef.current = focusContextByEventId;

  useEffect(() => {
    return subscribeGlobeContextHubOpen((detail) => {
      const eventId = detail.contextEventId.trim();
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
      if (mode === "map") {
        void focusContextByEventIdRef.current(detail.eventId, {
          openSheet: false,
          mapTap: true,
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

  const onRecallEventId = useCallback(
    (eventId: string) => {
      setListOpen(false);
      setManageOpen(false);
      focusContextByEventId(eventId);
    },
    [focusContextByEventId],
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
        globeRef.current?.flyToPin(next.lat, next.lng, "neighborhood");
        return next;
      });
    };
    window.addEventListener(EVENT_CANDIDATES_UPDATED, sync);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, sync);
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

  activeClusterRef.current = activeCluster;
  contextTapPhaseRef.current = contextTapPhase;
  stackClustersRef.current = stackClusters;
  sheetOpenRef.current = sheetOpen;

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
    if (searchParams.get("openField") !== "1") {
      return;
    }
    if (layerMode !== "discovery") {
      onLayerModeChange("discovery");
    } else {
      openFieldSheet();
    }
    const params = new URLSearchParams(window.location.search);
    params.delete("openField");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [layerMode, onLayerModeChange, openFieldSheet, searchParams]);

  useEffect(() => {
    return () => {
      if (revertTimerRef.current !== null) {
        window.clearTimeout(revertTimerRef.current);
      }
    };
  }, []);

  const onStackSelect = useCallback(
    (cluster: PinCluster) => {
      openContextCluster(cluster);
    },
    [openContextCluster],
  );

  const openContextByEventId = useCallback(
    (eventId: string) => {
      setListOpen(false);
      focusContextByEventId(eventId, { openSheet: true });
    },
    [focusContextByEventId],
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
      openContextByEventId(entry.eventId);
    },
    [openContextByEventId],
  );

  const onDiscoveryMarketBrowse = useCallback(() => {
    const marketPin = clustersRef.current.find(
      (cluster) => cluster.marketRole && cluster.origin === "external",
    );
    if (!marketPin) {
      toast.message(copy.globe.discoveryMarketBrowseEmpty);
      return;
    }
    globeRef.current?.flyToPin(marketPin.lat, marketPin.lng, "street", {
      pinViewportY: 0.58,
    });
    setActiveCluster(marketPin);
  }, []);

  const beginPhotoIngestFlow = useCallback(async (files: File[]) => {
    if (layerMode === "discovery") {
      toast.message(copy.globe.ingestDiscoveryNoTrace);
      return;
    }
    if (files.length === 0) {
      return;
    }
    revokePhotoIngestPreviewUrls(photoFileProgressRef.current);
    const progressItems = buildPhotoIngestFileItems(files);
    photoFileProgressRef.current = progressItems;
    setPhotoFileProgress(progressItems);
    setConfirmDraft(null);
    setConfirmError(null);
    setConfirmPreparing(true);
    setConfirmOpen(true);
    try {
      const draft = await prepareGlobePhotoIngestDraft(files, {
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
      void beginPhotoIngestFlow(validated.files);
    },
    [beginPhotoIngestFlow],
  );

  useEffect(() => {
    return subscribeGlobePhotoIngest((files) => {
      void beginPhotoIngestFlow(files);
    });
  }, [beginPhotoIngestFlow]);

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
          const outcome = await ingestGlobeContextFromText(input.composeText.trim());
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
          const outcome = await ingestGlobeContextFromText(
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
    [activeCluster?.eventId, marketTradeBusy],
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
          const outcome = await ingestGlobeContextFromText(input.composeText.trim());
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
    [focusContextByEventId, liveLocation?.lat, liveLocation?.lng, marketTradeBusy],
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

  useEffect(() => {
    return subscribeGlobePortalOpen((request) => {
      void openPortal({
        eventId: request.eventId,
        composeText: request.composeText,
        initialIntentId: request.initialIntentId,
        source: request.source ?? "hub",
      });
    });
  }, [openPortal]);

  const trendBridgeAnchorLat =
    activeCluster?.lat ?? liveLocation?.lat ?? null;
  const trendBridgeAnchorLng =
    activeCluster?.lng ?? liveLocation?.lng ?? null;

  const globeRenderSuspended =
    sheetOpen ||
    hubDetailOpen ||
    portalOpen ||
    marketConfirmOpen ||
    createOpen ||
    listOpen ||
    manageOpen ||
    marketManageOpen ||
    settingsOpen ||
    globeInboxOpen ||
    fieldOverlayOpen ||
    mediaPoolOpen ||
    bridgeGhostOpen ||
    shareSheetOpen ||
    layerSwitchSuspend;

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
      void focusContextByEventId(session.eventId, {
        openSheet: session.kind === "market",
        mapTap: session.kind === "context",
      });
    },
    [focusContextByEventId],
  );

  return (
    <div
      className="relative flex h-full min-h-0 flex-1 flex-col"
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
        bridgeGhostClusters={bridgeGhostClusters}
        renderSuspended={globeRenderSuspended}
        focusedContextEventId={activeCluster?.eventId ?? null}
        showInteractionHint={false}
        layerMode={layerMode}
      />
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
        visible={Boolean(stackClusters && stackClusters.length > 1)}
        onSelect={onStackSelect}
        onDismiss={clearActiveContext}
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
      />
      {contextTapPhase === "awaiting_replay" &&
      hubEventId &&
      !contextHasMapMedia &&
      !sheetOpen &&
      !mapMediaFocusOpen &&
      !confirmOpen ? (
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
      <GlobeLodgingFocusStage
        globeRef={globeRef}
        contextEventId={hubEventId}
        lat={liveLocation?.lat ?? null}
        lng={liveLocation?.lng ?? null}
        viewerUserId={user?.id ?? null}
      />
      <div className="pointer-events-none absolute left-3 top-[max(0.5rem,env(safe-area-inset-top))] z-20 flex max-h-[calc(100%-var(--rimvio-globe-ingest-offset)-5.5rem)] flex-col items-start gap-1.5">
        {!mapMediaFocusOpen ? (
          <>
            <div className="pointer-events-auto">
              <GlobeLayerModeToggle
                mode={layerMode}
                onModeChange={onLayerModeChange}
              />
            </div>
            {layerMode === "discovery" ? (
              <p
                className="pointer-events-none max-w-[11rem] px-1 text-[11px] font-medium leading-snug text-muted-foreground"
                data-globe-layer-mode-hint
              >
                {copy.globe.layerModeDiscoveryHint}
              </p>
            ) : null}
            {layerMode === "personal" ? (
            <div className="pointer-events-auto">
              <GlobeContextControlDock
                timeFilter={timeFilter}
                onTimeFilterChange={setTimeFilter}
                peopleFilter={peopleFilter}
                onPeopleFilterChange={setPeopleFilter}
                peerOptions={peerOptions}
                onCreate={openPhotoPicker}
                onList={() => setListOpen(true)}
                onManage={() => setManageOpen(true)}
                onFlyToHere={
                  liveLocation
                    ? () =>
                        globeRef.current?.flyToPin(
                          liveLocation.lat,
                          liveLocation.lng,
                          "neighborhood",
                        )
                    : undefined
                }
              />
            </div>
            ) : null}
            {layerMode === "personal" && !hubEventId ? (
              <GlobeTrendBridgePulseChip
                className="pointer-events-auto"
                enabled={trendBridgeSettings.enabled}
                activeBridgeId={trendBridgeSettings.activeBridgeId}
                pulseIntent={trendBridgeSettings.pulseIntent}
                onToggle={onTrendBridgeModeChange}
                onBridgeSelect={onTrendBridgeSelect}
                onPulseIntentChange={onTrendBridgePulseIntentChange}
              />
            ) : null}
          </>
        ) : null}
        {hubEventId &&
        !hubDetailOpen &&
        !suppressMapHubRail ? (
          <GlobeContextHubRail
            className="pointer-events-auto"
            visible={!globeRenderSuspended}
            activeEventId={hubEventId}
            lat={liveLocation?.lat ?? null}
            lng={liveLocation?.lng ?? null}
            authUserId={user?.id ?? null}
            layout="dock"
            variant="compact"
            globeRef={globeRef}
          />
        ) : null}
      </div>
      <GlobeContextHubDetailSheet
        open={hubDetailOpen}
        onOpenChange={setHubDetailOpen}
        activeEventId={hubEventId}
        lat={liveLocation?.lat ?? null}
        lng={liveLocation?.lng ?? null}
        authUserId={user?.id ?? null}
        visible={Boolean(hubEventId)}
        globeRef={globeRef}
      />
      {!mapMediaFocusOpen ? (
      <div className="pointer-events-none absolute right-3 top-[max(0.5rem,env(safe-area-inset-top))] z-20">
        <GlobeUtilityMenu
          mediaPoolCount={mediaPoolCount}
          inboxCount={globeInboxCount}
          marketManageCount={marketManageCount}
          showFieldEntry={layerMode === "discovery"}
          fieldMatchCount={fieldMatchCount}
          onOpenMediaPool={() => setMediaPoolOpen(true)}
          onOpenInbox={() => setGlobeInboxOpen(true)}
          onOpenMarketManage={() => setMarketManageOpen(true)}
          onOpenField={() =>
            openFieldSheet({
              primaryEventId: activeCluster?.eventId ?? null,
            })
          }
          onOpenSettings={() => setSettingsOpen(true)}
          className="pointer-events-auto"
        />
      </div>
      ) : null}
      {!mapMediaFocusOpen ? (
      <GlobeHomeMemoryRecallProvider
        enabled={!globeRenderSuspended}
        layerMode={layerMode}
        activeEventId={activeCluster?.eventId ?? null}
        globeDismissToken={globeMemoryDismissToken}
        registerComposeHandlers={registerMemoryRecallComposeHandlers}
        onActivateTrigger={onMemoryTriggerPress}
        onResumeSession={onResumeSession}
      >
      <GlobeCaptureDock
        ref={ingestBarRef}
        composeHidden={portalOpen || marketConfirmOpen}
        composeAccessory={
          !confirmOpen && !sheetOpen && layerMode === "personal" ? (
            <GlobeComposeAccessoryBar
              portalPeekOpen={portalPeekOpen}
              onPortalPeekToggle={togglePortalPeek}
            >
              <GlobeHomeMemoryRecallToggleAnchor embedded />
            </GlobeComposeAccessoryBar>
          ) : null
        }
        stackAboveCompose={
          <>
            {pulseMainActionEnabled ? (
              <MarketAlignmentSurface
                enabled={pulseMainActionEnabled}
                focusEventId={marketFocusEventId ?? activeCluster?.eventId ?? null}
                onFocusMatchEvent={(eventId) => {
                  setMarketFocusEventId(eventId);
                  void focusContextOnMap(eventId);
                }}
                onFocusMatchOffer={(offer) => {
                  setMarketFocusEventId(offer.selfEventId);
                  if (offer.matchUserId) {
                    globeRef.current?.flyToPin(
                      offer.matchLat,
                      offer.matchLng,
                      "street",
                      { pinViewportY: 0.58 },
                    );
                    return;
                  }
                  void focusContextOnMap(offer.matchEventId);
                }}
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
        ingest={{
          targetEventId: activeCluster?.eventId ?? null,
          targetTitle: activeCluster?.title ?? null,
          forceAttachToTarget: Boolean(activeCluster?.eventId),
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
          onTextCommitted: (input) => {
            void openPortal({
              eventId: input.eventId,
              composeText: input.text,
              source: "composer",
            });
          },
          onOpenPortal: (input) => {
            void openPortal({
              eventId: input.eventId,
              composeText: input.composeText,
              source: "composer",
            });
          },
          onQuickListMarket: (input) => quickListMarket(input),
          onOpenMarketManage: () => setMarketManageOpen(true),
          marketRoleBusy: marketTradeBusy,
          layerMode,
          onDiscoveryMarketBrowse,
          onComposeFocus: () => memoryRecallComposeRef.current?.onFocus(),
          onComposeBlur: () => memoryRecallComposeRef.current?.onBlur(),
        }}
      />
      </GlobeHomeMemoryRecallProvider>
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
        open={sheetOpen}
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
            void beginPhotoIngestFlow(files);
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
        onDeleted={(eventIds) => {
          if (activeCluster && eventIds.includes(activeCluster.eventId)) {
            setSheetOpen(false);
            setActiveCluster(null);
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
        }}
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
        onOpenChange={(open) => {
          setMarketConfirmOpen(open);
          if (!open) {
            setMarketWizardStartStep(undefined);
            setMarketPortalLaunch(false);
          }
        }}
        onConfirmed={({ eventId, role, lat, lng, placeLabel }) => {
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
      <GlobeMarketManageSheet
        open={marketManageOpen}
        onOpenChange={setMarketManageOpen}
        onFlyToIntent={(record) => {
          setMarketFocusEventId(record.eventId);
          globeRef.current?.flyToPin(record.anchorLat, record.anchorLng, "street", {
            pinViewportY: 0.58,
          });
          focusContextByEventId(record.eventId, { openSheet: false });
        }}
      />
      <GlobeSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onShowGlobeGuide={() => {
          setSettingsOpen(false);
          setGlobeGuideOpen(true);
        }}
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
  );
}

/** Globe-first home — pins only, tap → replay. */
export function GlobeHomeClient() {
  return (
    <Suspense fallback={null}>
      <GlobeHomeBody />
    </Suspense>
  );
}
