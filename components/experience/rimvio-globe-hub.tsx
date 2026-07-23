"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import { RimvioGlobe3DClient } from "@/components/experience/rimvio-globe-3d-client";
import type { RimvioGlobe3DHandle } from "@/components/experience/rimvio-globe-3d";
import { useExperienceGraph } from "@/hooks/use-experience-graph";
import { useGpsTrackingEnabled } from "@/hooks/use-gps-tracking-enabled";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { useGlobeFieldDiscoveryReveal, filterFieldRevealIntents, filterFieldRevealPlaceClusters } from "@/hooks/use-globe-field-discovery-reveal";
import { useGlobeLodgingDiscoveryReveal } from "@/hooks/use-globe-lodging-discovery-reveal";
import { useResourceOperationRevision } from "@/hooks/use-resource-operation-revision";
import { useGlobeEateryDiscoveryReveal } from "@/hooks/use-globe-eatery-discovery-reveal";
import { useGlobePinsPlatformExternal } from "@/hooks/use-globe-pins-platform-external";
import { useMarketDiscoveryPins } from "@/hooks/use-market-discovery-pins";
import { useRelationshipFeedSlots } from "@/hooks/use-relationship-feed-slots";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import { buildFeedSlotPeerLookup } from "@/lib/feed/build-feed-slot-peer-lookup";
import { enrichClassifiedGlobePinPeers } from "@/lib/globe/project-globe-pin-peers";
import { enrichClassifiedGlobePinSharedWith } from "@/lib/globe/enrich-globe-pin-shared-with";
import { EXPERIENCE_BRIDGE_UPDATED } from "@/lib/experience-bridge/local-bridge-store";
import { applyPinCoordOverrides } from "@/lib/globe/apply-pin-coord-overrides";
import {
  matchesGlobeContextTimeFilter,
  type GlobeContextTimeFilter,
} from "@/lib/globe/globe-context-time-filter";
import {
  matchesGlobeContextPeopleFilter,
  type GlobeContextPeopleFilter,
} from "@/lib/globe/globe-context-people-filter";
import {
  type GlobeDetailLevel,
} from "@/lib/globe/globe-zoom-levels";
import { projectGlobeZoomClusterPins } from "@/lib/globe/project-globe-zoom-cluster-pins";
import { projectGlobePinDisplayMode } from "@/lib/globe/project-globe-pin-display-mode";
import { resolveGlobeStartupView } from "@/lib/globe/resolve-globe-startup-view";
import { ensureGlobeDemoEvents } from "@/lib/experience-graph/seed-globe-demo-events";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { indexEventsById } from "@/lib/plan-context/project-plan-to-feed-slot";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { PERSONAL_GLOBE_PINS_UPDATED } from "@/lib/globe/personal-globe-pin-store";
import {
  findPinClusterByEventId,
  findPinClusterByPinId,
  projectPinClusterClassifiedPins,
  projectPinClustersFromGraph,
} from "@/lib/globe/project-pin-clusters";
import { projectGlobeTripArcs } from "@/lib/globe/project-trip-leg-arcs";
import type { GlobeTripArc } from "@/lib/globe/project-trip-leg-arcs";
import {
  decorateEateryMarkersWithContextCondition,
  decorateLodgingMarkersWithContextCondition,
} from "@/lib/globe/context-condition-ai/decorate-context-condition-globe-markers";
import {
  mergeContextConditionEateryMarkers,
  mergeContextConditionLodgingMarkers,
  projectContextConditionEateryGlobeMarkers,
  projectContextConditionLodgingGlobeMarkers,
} from "@/lib/globe/context-condition-ai/project-context-condition-globe-markers";
import { readContextConditionPinBatches } from "@/lib/globe/context-condition-ai/context-condition-batch-metadata";
import { readContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import { applyFocusedHubGlobePins } from "@/lib/globe/context-hub/apply-focused-hub-globe-visuals";
import { enrichGlobePinRecallBadges } from "@/lib/globe/enrich-globe-pin-recall-badge";
import {
  dispatchGlobeLodgingFocus,
  subscribeGlobeLodgingFocus,
} from "@/lib/globe/context-hub/globe-lodging-marker-bridge";
import {
  dispatchGlobeEateryFocus,
  subscribeGlobeEateryFocus,
} from "@/lib/globe/eatery/globe-eatery-focus-bridge";
import { subscribeGeoOntologyFacetState } from "@/lib/globe/spatial-semantic/geo-ontology-graph-store";
import { filterPinClustersForLayerPolicy } from "@/lib/globe/spatial-semantic/filter-pin-clusters-for-layer-policy";
import {
  readGlobeProjectionLayerPolicy,
  subscribeGlobeProjectionLayerPolicy,
} from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
import { isGlobeSoloStagePolicy } from "@/lib/globe/spatial-semantic/enter-context-solo-stage";
import {
  filterContextConditionMarkersByPlaceIds,
  filterHubMarkersByProjectionPolicy,
  shouldProjectContextConditionMarkers,
  shouldShowContextConditionDiscoveryOverlay,
} from "@/lib/globe/spatial-semantic/resolve-context-condition-marker-visibility";
import {
  clearContextBloom,
  decorateEateryMarkersWithBloom,
  decorateLodgingMarkersWithBloom,
  eateryMarkersToBloomCandidates,
  lodgingMarkersToBloomCandidates,
  readContextBloomArcsVisible,
  startContextBloom,
  subscribeContextBloom,
  resolveContextEventIdFromResourceId,
} from "@/lib/visual-projection";
import {
  persistContextBloomRelationsOnEvent,
  readPersistedBloomRelated,
} from "@/lib/reality-object";
import { GlobeRealityObjectCard } from "@/components/globe/globe-reality-object-card";
import {
  publishContextAgentGlobeMarkerFocus,
  resolveContextAgentGlobeMarkerFocus,
} from "@/lib/globe/context-agent/context-agent-globe-marker-focus";
import { subscribeGlobeMapMediaFocus } from "@/lib/globe/globe-map-media-focus-bridge";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { isLodgingHubEnabled } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { isEateryHubEnabled } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { readPinnedEateryResourceId } from "@/lib/globe/eatery/pin-eatery-selection-to-context";
import { projectLodgingGlobeMarkers } from "@/lib/globe/context-hub/project-lodging-globe-markers";
import {
  dispatchGlobePlaceOntologyFocus,
} from "@/lib/globe/place-ontology/globe-place-ontology-focus-bridge";
import {
  dispatchGlobeResourceReelFocus,
} from "@/lib/globe/resource-reel/globe-resource-reel-bridge";
import {
  applyLodgingOperationSignal,
  markLodgingResourceComparing,
  resolveResourceOperationResume,
} from "@/lib/resource-operation";
import { resolveContextResourceMapMarkers } from "@/lib/globe/resolve-context-resource-map-markers";
import { projectEateryGlobeMarkers } from "@/lib/globe/eatery/project-eatery-globe-markers";
import { projectContextHubGlobeAnchor } from "@/lib/globe/context-hub/project-context-hub-globe-anchor";
import { dispatchGlobeContextHubOpen } from "@/lib/globe/context-hub/globe-context-hub-open-bridge";
import { rankContextResources } from "@/lib/globe/resource/rank-context-resources";
import { resolveGlobeClustersForLayerMode } from "@/lib/globe/filter-globe-clusters-by-layer-mode";
import { projectMarketDiscoveryPinClusters } from "@/lib/globe/market/project-market-discovery-pins";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import { useIosPwaMemoryGuards } from "@/hooks/use-ios-pwa-memory-guards";
import {
  iosPwaDiscoveryPinsDelayMs,
} from "@/lib/platform/ios-pwa-memory";
import Link from "next/link";
import { copy } from "@/lib/copy/human-ko";
import { dispatchOpenCaptureSheet } from "@/lib/nav/open-capture-sheet-bridge";
import { RimvioStarterExampleChips } from "@/components/rimvio-starter-example-chips";
import { GlobeContextFirstDemo } from "@/components/globe/globe-context-first-demo";
import { cn } from "@/lib/utils";
import { projectGhostEateryGlobeMarkers } from "@/lib/situation-projection/project-ghost-eatery-globe-markers";
import {
  mergeLodgingAgentGlobeMarkers,
  projectLodgingAgentGlobeMarkers,
} from "@/lib/globe/lodging-agent/project-lodging-agent-globe-markers";
import {
  readProjectionManifestForAnchor,
  subscribeProjectionStore,
} from "@/lib/situation-projection/projection-store";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

function useGlobeEventSnapshot() {
  const [ready, setReady] = useState(false);
  const [eventsById, setEventsById] = useState<ReadonlyMap<string, EventCandidate>>(
    () => new Map<string, EventCandidate>(),
  );
  const [personalPinRevision, setPersonalPinRevision] = useState(0);

  useEffect(() => {
    ensureGlobeDemoEvents();
    const refreshEvents = () => {
      setEventsById(indexEventsById(listLifeEventCandidates()));
      setReady(true);
    };
    const refreshPersonalPins = () => {
      setPersonalPinRevision((value) => value + 1);
    };
    refreshEvents();
    window.addEventListener(EVENT_CANDIDATES_UPDATED, refreshEvents);
    window.addEventListener(PERSONAL_GLOBE_PINS_UPDATED, refreshPersonalPins);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, refreshEvents);
      window.removeEventListener(PERSONAL_GLOBE_PINS_UPDATED, refreshPersonalPins);
    };
  }, []);

  return { ready, eventsById, personalPinRevision };
}

export type RimvioGlobeHubHandle = {
  flyToPin: RimvioGlobe3DHandle["flyToPin"];
  snapToPin: RimvioGlobe3DHandle["snapToPin"];
  snapToDiscoveryBounds: RimvioGlobe3DHandle["snapToDiscoveryBounds"];
  flyToDiscoveryBounds: RimvioGlobe3DHandle["flyToDiscoveryBounds"];
  clearPinViewportBias: RimvioGlobe3DHandle["clearPinViewportBias"];
  resetToOverview: () => void;
  getPointOfView: RimvioGlobe3DHandle["getPointOfView"];
  getScreenCoords: RimvioGlobe3DHandle["getScreenCoords"];
};

import type { GlobeLodgingDiscoveryCard } from "@/lib/globe/lodging/project-lodging-discovery-session";
import type { GlobeEateryDiscoveryCard } from "@/lib/globe/eatery/project-eatery-discovery-session";

export type RimvioGlobeHubProps = {
  className?: string;
  globeRef?: Ref<RimvioGlobeHubHandle>;
  lodgingDiscoveryCards?: Readonly<Record<string, GlobeLodgingDiscoveryCard>> | null;
  eateryDiscoveryCards?: Readonly<Record<string, GlobeEateryDiscoveryCard>> | null;
  initialOpenPinId?: string | null;
  initialRecallEventId?: string | null;
  /** Fallback when context is not yet projected as a globe pin cluster. */
  onRecallEventId?: (eventId: string) => void;
  /** Highlight pin card while pin sheet is open — does not lock zoom. */
  highlightedPinId?: string | null;
  onPinPress?: (cluster: PinCluster) => void;
  /** Zoomed-out cluster badge — multiple contexts at one tap. */
  onContextGroupPress?: (clusters: readonly PinCluster[]) => void;
  pinRelocateEnabled?: boolean;
  onPinRelocate?: (input: {
    pinId: string;
    sourceEventId: string;
    lat: number;
    lng: number;
  }) => void;
  timeFilter?: GlobeContextTimeFilter;
  peopleFilter?: GlobeContextPeopleFilter;
  pinCoordOverrides?: ReadonlyMap<
    string,
    { lat: number; lng: number }
  >;
  skipStartupFly?: boolean;
  onGlobePress?: (coords: { lat: number; lng: number }) => void;
  onClustersSnapshot?: (clusters: readonly PinCluster[]) => void;
  onDetailLevelChange?: (level: GlobeDetailLevel) => void;
  /** Pending Experience Bridge invites — ghost pins until accept. */
  bridgeGhostClusters?: readonly PinCluster[];
  /** Stop WebGL render loop while sheets cover the globe. */
  renderSuspended?: boolean;
  /** Selected context — draw hub connector arc on the globe. */
  focusedContextEventId?: string | null;
  /** Reality Surface bridge path arcs — projection only. */
  realityBridgeArcs?: readonly GlobeTripArc[];
  /** 맥락 AI placement — radius ring + POI route on globe. */
  contextConditionDiscoveryOverlay?: import("@/lib/globe/context-condition-ai/context-condition-discovery-overlay-types").ContextConditionDiscoveryOverlay | null;
  discoveryLensSession?: import("@/lib/globe/discovery-lens/types").DiscoveryLensSession | null;
  /** Hub map anchor press — opens Hub detail, not pin info sheet. */
  onContextHubAnchorPress?: (contextEventId: string) => void;
  /** Pinch/drag coach on the globe canvas — off when capture dock is shown. */
  showInteractionHint?: boolean;
  /** personal = 내 지구 · discovery = 밖 지구 (external traces only). */
  layerMode?: GlobeLayerMode;
  brainSurfaceMarkers?: readonly BrainSurfaceProjectionCandidate[];
  onBrainSurfaceMarkerPress?: (candidateId: string) => void;
  /** Video spatial trace — hub lines between root and inferred places. */
  brainSurfaceTraceArcs?: readonly GlobeTripArc[];
  /** 맥락 어시스턴트 pick — globe pan/zoom stays live on pins. */
  contextAgentPickMode?: boolean;
};

type RimvioGlobeHubBodyProps = {
  className?: string;
  globeRef?: Ref<RimvioGlobeHubHandle>;
  clusters: readonly PinCluster[];
  eventsById: ReadonlyMap<string, EventCandidate>;
  initialOpenPinId?: string | null;
  highlightedPinId?: string | null;
  onPinPress?: (cluster: PinCluster) => void;
  /** Zoomed-out cluster badge — multiple contexts at one tap. */
  onContextGroupPress?: (clusters: readonly PinCluster[]) => void;
  pinRelocateEnabled?: boolean;
  onPinRelocate?: (input: {
    pinId: string;
    sourceEventId: string;
    lat: number;
    lng: number;
  }) => void;
  pinCoordOverrides?: ReadonlyMap<
    string,
    { lat: number; lng: number }
  >;
  skipStartupFly?: boolean;
  onGlobePress?: (coords: { lat: number; lng: number }) => void;
  onDetailLevelChange?: (level: GlobeDetailLevel) => void;
  renderSuspended?: boolean;
  focusedContextEventId?: string | null;
  realityBridgeArcs?: readonly GlobeTripArc[];
  contextConditionDiscoveryOverlay?: import("@/lib/globe/context-condition-ai/context-condition-discovery-overlay-types").ContextConditionDiscoveryOverlay | null;
  discoveryLensSession?: import("@/lib/globe/discovery-lens/types").DiscoveryLensSession | null;
  onContextHubAnchorPress?: (contextEventId: string) => void;
  showInteractionHint?: boolean;
  layerMode?: GlobeLayerMode;
  lodgingDiscoveryCards?: Readonly<Record<string, GlobeLodgingDiscoveryCard>> | null;
  eateryDiscoveryCards?: Readonly<Record<string, GlobeEateryDiscoveryCard>> | null;
  brainSurfaceMarkers?: readonly BrainSurfaceProjectionCandidate[];
  onBrainSurfaceMarkerPress?: (candidateId: string) => void;
  /** Video spatial trace — hub lines between root and inferred places. */
  brainSurfaceTraceArcs?: readonly GlobeTripArc[];
  /** 맥락 어시스턴트 pick — globe pan/zoom stays live on pins. */
  contextAgentPickMode?: boolean;
};

const RimvioGlobeHubBody = memo(
  forwardRef<RimvioGlobeHubHandle, RimvioGlobeHubBodyProps>(function RimvioGlobeHubBody(
    {
      className,
      clusters,
      eventsById,
      initialOpenPinId,
      highlightedPinId,
      onPinPress,
      onContextGroupPress,
      pinRelocateEnabled = false,
      onPinRelocate,
      pinCoordOverrides,
      skipStartupFly = false,
      onGlobePress,
      onDetailLevelChange,
      renderSuspended = false,
      focusedContextEventId = null,
      realityBridgeArcs = [],
      contextConditionDiscoveryOverlay = null,
      discoveryLensSession = null,
      onContextHubAnchorPress,
      showInteractionHint = true,
      layerMode = "personal",
      lodgingDiscoveryCards = null,
      eateryDiscoveryCards = null,
      brainSurfaceMarkers = [],
      onBrainSurfaceMarkerPress,
      brainSurfaceTraceArcs = [],
      contextAgentPickMode = false,
    },
    ref,
  ) {
    const innerGlobeRef = useRef<RimvioGlobe3DHandle>(null);
    const startupFlownRef = useRef(false);
    const [detailLevel, setDetailLevel] = useState<GlobeDetailLevel>("space");
    const [bridgeRevision, setBridgeRevision] = useState(0);
    const [activeLodgingResourceId, setActiveLodgingResourceId] = useState<string | null>(
      null,
    );
    const [activeEateryResourceId, setActiveEateryResourceId] = useState<string | null>(
      null,
    );
    const [mapMediaFocusOpen, setMapMediaFocusOpen] = useState(false);
    const [expandedPinId, setExpandedPinId] = useState<string | null>(null);
    const [ontologyFacetRevision, setOntologyFacetRevision] = useState(0);
    const [layerPolicyRevision, setLayerPolicyRevision] = useState(0);
    const [contextBloomRevision, setContextBloomRevision] = useState(0);
    useEffect(() => {
      const bump = () => setBridgeRevision((value) => value + 1);
      window.addEventListener(EXPERIENCE_BRIDGE_UPDATED, bump);
      return () => window.removeEventListener(EXPERIENCE_BRIDGE_UPDATED, bump);
    }, []);
    useEffect(() => {
      return subscribeGeoOntologyFacetState(() => {
        setOntologyFacetRevision((value) => value + 1);
      });
    }, []);
    useEffect(() => {
      return subscribeGlobeProjectionLayerPolicy(() => {
        setLayerPolicyRevision((value) => value + 1);
      });
    }, []);
    useEffect(() => {
      return subscribeContextBloom(() => {
        setContextBloomRevision((value) => value + 1);
      });
    }, []);
    useEffect(() => {
      return subscribeGlobeLodgingFocus((detail) => {
        setActiveLodgingResourceId(detail.resourceId);
      });
    }, []);
    useEffect(() => {
      return subscribeGlobeEateryFocus((detail) => {
        setActiveEateryResourceId(detail.resourceId);
      });
    }, []);
    useEffect(() => {
      return subscribeGlobeMapMediaFocus((detail) => {
        setMapMediaFocusOpen(detail.open);
        if (detail.open) {
          setExpandedPinId(null);
        }
      });
    }, []);
    useEffect(() => {
      setActiveLodgingResourceId(null);
      setActiveEateryResourceId(null);
      setMapMediaFocusOpen(false);
      setExpandedPinId(null);
    }, [focusedContextEventId]);
    const handleDetailLevelChange = useCallback(
      (level: GlobeDetailLevel) => {
        setDetailLevel((prev) => (prev === level ? prev : level));
        onDetailLevelChange?.(level);
      },
      [onDetailLevelChange],
    );
    const { slots: relationshipSlots } = useRelationshipFeedSlots(true);
    const peerLookup = useMemo(
      () =>
        buildFeedSlotPeerLookup({
          messages: [],
          relationshipSlots,
          contacts: readPeerContacts(),
        }),
      [relationshipSlots],
    );
    const classifiedPins = useMemo(
      () =>
        enrichClassifiedGlobePinSharedWith(
          enrichClassifiedGlobePinPeers(
            projectPinClusterClassifiedPins(clusters, eventsById),
            eventsById,
            peerLookup,
          ),
          peerLookup,
        ),
      [clusters, eventsById, peerLookup, bridgeRevision],
    );
    const { enabled: gpsEnabled } = useGpsTrackingEnabled();
    const liveLocation = useLiveLocationSnapshot();
    const lodgingDiscoveryReveal = useGlobeLodgingDiscoveryReveal(focusedContextEventId);
    const resourceOperationRevision = useResourceOperationRevision();
    const eateryDiscoveryReveal = useGlobeEateryDiscoveryReveal(focusedContextEventId);
    const displayViewerRef = useRef<{ lat: number; lng: number } | null>(null);
    const [displayViewer, setDisplayViewer] = useState<{ lat: number; lng: number } | null>(
      null,
    );
    const [projectionRevision, setProjectionRevision] = useState(0);

    useEffect(() => {
      return subscribeProjectionStore(() => {
        setProjectionRevision((value) => value + 1);
      });
    }, []);

    useEffect(() => {
      const lat = liveLocation?.lat;
      const lng = liveLocation?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") {
        return;
      }
      const prev = displayViewerRef.current;
      if (
        prev &&
        Math.abs(prev.lat - lat) < 0.00045 &&
        Math.abs(prev.lng - lng) < 0.00045
      ) {
        return;
      }
      const timer = window.setTimeout(() => {
        const next = { lat, lng };
        displayViewerRef.current = next;
        setDisplayViewer(next);
      }, 600);
      return () => window.clearTimeout(timer);
    }, [liveLocation?.lat, liveLocation?.lng]);

    const displayPins = useMemo(() => {
      const withDisplay = projectGlobePinDisplayMode({
        pins: classifiedPins,
        eventsById,
        focusedEventId: focusedContextEventId,
        expandedPinId,
        lodgingFocusStageOpen: mapMediaFocusOpen,
        viewerLat: displayViewer?.lat ?? liveLocation?.lat ?? null,
        viewerLng: displayViewer?.lng ?? liveLocation?.lng ?? null,
      });
      const withOverrides = applyPinCoordOverrides(
        withDisplay,
        pinCoordOverrides ?? new Map(),
      );
      const zoomed = projectGlobeZoomClusterPins(withOverrides, detailLevel);
      return enrichGlobePinRecallBadges(
        applyFocusedHubGlobePins(zoomed, {
          focusedEventId: focusedContextEventId,
          eventsById,
        }),
        eventsById,
      );
    }, [
      classifiedPins,
      eventsById,
      expandedPinId,
      mapMediaFocusOpen,
      displayViewer,
      liveLocation?.lat,
      liveLocation?.lng,
      pinCoordOverrides,
      detailLevel,
      focusedContextEventId,
    ]);
    const layerPolicy = useMemo(() => {
      void layerPolicyRevision;
      return readGlobeProjectionLayerPolicy();
    }, [layerPolicyRevision]);
    const soloStageActive = isGlobeSoloStagePolicy(layerPolicy);
    const gatedDiscoveryOverlay = useMemo(() => {
      if (!contextConditionDiscoveryOverlay) {
        return null;
      }
      if (
        !shouldShowContextConditionDiscoveryOverlay(
          layerPolicy,
          focusedContextEventId,
        )
      ) {
        return null;
      }
      return contextConditionDiscoveryOverlay;
    }, [contextConditionDiscoveryOverlay, focusedContextEventId, layerPolicy]);
    const tripArcs = useMemo(
      () => {
        void contextBloomRevision;
        const eventArcs = projectGlobeTripArcs({
          eventsById,
          clusters,
          focusedEventId: focusedContextEventId,
          showBackgroundTripArcs: false,
        });
        const discoveryArcs = gatedDiscoveryOverlay?.routeArcs ?? [];
        const bloomArcs = readContextBloomArcsVisible();
        const merged = [
          ...bloomArcs,
          ...brainSurfaceTraceArcs,
          ...discoveryArcs,
          ...eventArcs,
        ];
        if (realityBridgeArcs.length > 0) {
          return [...realityBridgeArcs, ...merged];
        }
        return merged;
      },
      [
        eventsById,
        clusters,
        focusedContextEventId,
        realityBridgeArcs,
        gatedDiscoveryOverlay,
        brainSurfaceTraceArcs,
        contextBloomRevision,
      ],
    );
    const lodgingGlobeMarkers = useMemo(() => {
      void bridgeRevision;
      void layerPolicyRevision;
      const eventId = focusedContextEventId?.trim();
      if (!eventId) {
        return [];
      }
      const event = eventsById.get(eventId);
      if (!event) {
        return [];
      }
      const cluster = clusters.find((row) => row.eventId === eventId);
      const meta = event.metadata as Record<string, unknown> | undefined;
      const hubLat =
        cluster?.lat ??
        (typeof meta?.globePlaceLat === "number" ? meta.globePlaceLat : null) ??
        liveLocation?.lat ??
        null;
      const hubLng =
        cluster?.lng ??
        (typeof meta?.globePlaceLng === "number" ? meta.globePlaceLng : null) ??
        liveLocation?.lng ??
        null;
      const activeBatchId = readContextConditionLastBatch(eventId)?.batchId ?? null;
      const contextConditionMarkers = shouldProjectContextConditionMarkers(
        layerPolicy,
        eventId,
      )
        ? filterContextConditionMarkersByPlaceIds(
            projectContextConditionLodgingGlobeMarkers({
              event,
              batchId: activeBatchId,
            }),
            layerPolicy,
          )
        : [];
      const hasContextConditionLodging =
        contextConditionMarkers.length > 0 ||
        (activeBatchId != null &&
          readContextConditionPinBatches(event).some(
            (batch) =>
              batch.batchId === activeBatchId && batch.lodgingPlaceIds.length > 0,
          ));

      if (!isLodgingHubEnabled(event) && !hasContextConditionLodging) {
        return [];
      }
      if (mapMediaFocusOpen) {
        return [];
      }

      let hubMarkers: ReturnType<typeof projectLodgingGlobeMarkers> = [];
      // Active Field scout lodging batch owns the map — do not merge stale hub APA.
      const scoutOwnsLodgingMap =
        hasContextConditionLodging && contextConditionMarkers.length > 0;

      if (isLodgingHubEnabled(event) && !scoutOwnsLodgingMap) {
        const panel = listContextHubServicesForEvent(event);
        if (panel) {
          const ranked = rankContextResources({
            event,
            services: panel.services,
            lat: liveLocation?.lat ?? null,
            lng: liveLocation?.lng ?? null,
          });
          const raw = projectLodgingGlobeMarkers({
            event,
            ranked,
            activeResourceId: activeLodgingResourceId,
            visibleResourceIds:
              lodgingDiscoveryReveal.visibleResourceIds.size > 0
                ? lodgingDiscoveryReveal.visibleResourceIds
                : null,
            popInDelays:
              lodgingDiscoveryReveal.popInDelays.size > 0
                ? lodgingDiscoveryReveal.popInDelays
                : null,
            manifest: readProjectionManifestForAnchor(eventId),
          });
          hubMarkers = raw.map((marker) => {
            const card = lodgingDiscoveryCards?.[marker.resourceId];
            if (!card) {
              return marker;
            }
            const priceLabel =
              card.priceKrw != null
                ? `₩${Math.round(card.priceKrw).toLocaleString("ko-KR")}`
                : null;
            return {
              ...marker,
              discoveryShortLabel: card.shortLabel,
              discoveryPriceLabel: priceLabel,
              discoveryAccent: card.accent,
            };
          });
        }
      }

      const withContextCondition = decorateLodgingMarkersWithContextCondition(
        scoutOwnsLodgingMap
          ? [...contextConditionMarkers]
          : mergeContextConditionLodgingMarkers(
              hubMarkers,
              contextConditionMarkers,
            ),
        event,
      );
      const hubFiltered = filterHubMarkersByProjectionPolicy({
        markers: withContextCondition,
        policy: layerPolicy,
        contextEventId: eventId,
      });
      const resolved = resolveContextResourceMapMarkers({
        markers: hubFiltered,
        hubLat,
        hubLng,
        layoutAtHub: contextConditionMarkers.length === 0,
        stagedDiscoveryCount: lodgingDiscoveryReveal.visibleResourceIds.size,
      }).map(applyLodgingOperationSignal);
      return decorateLodgingMarkersWithBloom(resolved);
    }, [
      activeLodgingResourceId,
      bridgeRevision,
      clusters,
      contextBloomRevision,
      eventsById,
      focusedContextEventId,
      liveLocation?.lat,
      liveLocation?.lng,
      lodgingDiscoveryReveal.popInDelays,
      lodgingDiscoveryReveal.visibleResourceIds,
      lodgingDiscoveryCards,
      mapMediaFocusOpen,
      ontologyFacetRevision,
      layerPolicy,
      layerPolicyRevision,
      resourceOperationRevision,
    ]);
    const eateryGlobeMarkers = useMemo(() => {
      void bridgeRevision;
      void projectionRevision;
      const eventId = focusedContextEventId?.trim();
      if (!eventId) {
        return [];
      }
      const event = eventsById.get(eventId);
      if (!event) {
        return [];
      }
      const effectiveActiveEateryResourceId =
        activeEateryResourceId ?? readPinnedEateryResourceId(event);
      const activeBatchId = readContextConditionLastBatch(eventId)?.batchId ?? null;
      const contextConditionEateryMarkers = shouldProjectContextConditionMarkers(
        layerPolicy,
        eventId,
      )
        ? filterContextConditionMarkersByPlaceIds(
            projectContextConditionEateryGlobeMarkers({
              event,
              batchId: activeBatchId,
            }),
            layerPolicy,
          )
        : [];
      const projectionGhostMarkers = projectGhostEateryGlobeMarkers({
        event,
        manifest: readProjectionManifestForAnchor(eventId),
        activeResourceId: effectiveActiveEateryResourceId,
      });
      const lodgingAgentMarkers = projectLodgingAgentGlobeMarkers({
        event,
        manifest: readProjectionManifestForAnchor(eventId),
        activeResourceId: effectiveActiveEateryResourceId,
      });
      if (!isEateryHubEnabled(event)) {
        const ghosts = mergeLodgingAgentGlobeMarkers(
          projectionGhostMarkers,
          lodgingAgentMarkers,
        );
        return mapMediaFocusOpen ? [] : ghosts;
      }
      const panel = listContextHubServicesForEvent(event);
      if (!panel) {
        const ghosts = mergeLodgingAgentGlobeMarkers(
          projectionGhostMarkers,
          lodgingAgentMarkers,
        );
        return mapMediaFocusOpen ? [] : ghosts;
      }
      const ranked = rankContextResources({
        event,
        services: panel.services,
        lat: liveLocation?.lat ?? null,
        lng: liveLocation?.lng ?? null,
      });
      const raw = projectEateryGlobeMarkers({
        event,
        ranked,
        activeResourceId: effectiveActiveEateryResourceId,
        visibleResourceIds:
          eateryDiscoveryReveal.visibleResourceIds.size > 0
            ? eateryDiscoveryReveal.visibleResourceIds
            : null,
        popInDelays:
          eateryDiscoveryReveal.popInDelays.size > 0
            ? eateryDiscoveryReveal.popInDelays
            : null,
        manifest: readProjectionManifestForAnchor(eventId),
      });
      const seenResourceIds = new Set(raw.map((marker) => marker.resourceId));
      const merged = mergeLodgingAgentGlobeMarkers(
        [
          ...raw,
          ...projectionGhostMarkers.filter(
            (marker) => !seenResourceIds.has(marker.resourceId),
          ),
        ],
        lodgingAgentMarkers,
      );
      if (!mapMediaFocusOpen) {
        const decorated = merged.map((marker) => {
          const card = eateryDiscoveryCards?.[marker.resourceId];
          if (!card) {
            return marker;
          }
          return {
            ...marker,
            discoveryShortLabel: card.shortLabel,
            discoveryPriceLabel: card.priceLabel,
            discoveryAccent: card.accent,
          };
        });
        const cluster = clusters.find((row) => row.eventId === eventId);
        const meta = event.metadata as Record<string, unknown> | undefined;
        const hubLat =
          cluster?.lat ??
          (typeof meta?.globePlaceLat === "number" ? meta.globePlaceLat : null) ??
          liveLocation?.lat ??
          null;
        const hubLng =
          cluster?.lng ??
          (typeof meta?.globePlaceLng === "number" ? meta.globePlaceLng : null) ??
          liveLocation?.lng ??
          null;
        const withContextCondition = decorateEateryMarkersWithContextCondition(
          mergeContextConditionEateryMarkers(decorated, contextConditionEateryMarkers),
          event,
        );
        const hubFiltered = filterHubMarkersByProjectionPolicy({
          markers: withContextCondition,
          policy: layerPolicy,
          contextEventId: eventId,
        });
        return decorateEateryMarkersWithBloom(
          resolveContextResourceMapMarkers({
            markers: hubFiltered,
            hubLat,
            hubLng,
            // Scout results keep inventory lat/lng (same as lodging) — don't
            // collapse every activity/eatery pill onto the context hub.
            layoutAtHub: contextConditionEateryMarkers.length === 0,
            stagedDiscoveryCount: eateryDiscoveryReveal.visibleResourceIds.size,
          }),
        );
      }
      return [];
    }, [
      activeEateryResourceId,
      bridgeRevision,
      clusters,
      contextBloomRevision,
      projectionRevision,
      eventsById,
      focusedContextEventId,
      liveLocation?.lat,
      liveLocation?.lng,
      eateryDiscoveryReveal.popInDelays,
      eateryDiscoveryReveal.visibleResourceIds,
      eateryDiscoveryCards,
      mapMediaFocusOpen,
      ontologyFacetRevision,
      layerPolicy,
      layerPolicyRevision,
    ]);
    const beginContextBloom = useCallback(
      (input: {
        selected: {
          id: string;
          resourceId: string;
          label: string;
          lat: number;
          lng: number;
          pinKind: "eatery" | "lodging" | "activity" | "amenity";
        };
        contextEventId?: string | null;
      }) => {
        const candidates = [
          ...lodgingMarkersToBloomCandidates(lodgingGlobeMarkers),
          ...eateryMarkersToBloomCandidates(eateryGlobeMarkers),
        ];
        const eventId =
          input.contextEventId?.trim() ||
          resolveContextEventIdFromResourceId(input.selected.resourceId) ||
          focusedContextEventId?.trim() ||
          "";
        const event = eventId ? eventsById.get(eventId) ?? null : null;
        const preferredRelated = readPersistedBloomRelated({
          event,
          selected: input.selected,
          candidates,
        });
        const session = startContextBloom({
          selected: input.selected,
          candidates,
          preferredRelated,
        });
        if (eventId && session.related.length > 0) {
          persistContextBloomRelationsOnEvent({
            contextEventId: eventId,
            selected: input.selected,
            related: session.related,
            event,
          });
        }
      },
      [
        eateryGlobeMarkers,
        eventsById,
        focusedContextEventId,
        lodgingGlobeMarkers,
      ],
    );
    const contextHubAnchor = useMemo(() => {
      const eventId = focusedContextEventId?.trim();
      if (!eventId) {
        return null;
      }
      const event = eventsById.get(eventId);
      const cluster = clusters.find((row) => row.eventId === eventId);
      if (!event || !cluster) {
        return null;
      }
      return projectContextHubGlobeAnchor({
        event,
        lat: cluster.lat,
        lng: cluster.lng,
      });
    }, [clusters, eventsById, focusedContextEventId]);
    const globePins = useMemo(() => {
      if (mapMediaFocusOpen) {
        return [];
      }
      const pins: ClassifiedGlobePin[] = [...displayPins];
      if (gpsEnabled && liveLocation) {
        pins.push({
          id: "viewer:here",
          kind: "gps",
          label: "현재 위치",
          lat: liveLocation.lat,
          lng: liveLocation.lng,
          pinX: 0,
          pinY: 0,
          pinShape: "viewer",
          emphasis: "primary",
        });
      }
      return pins;
    }, [displayPins, gpsEnabled, liveLocation, mapMediaFocusOpen]);
    const [activePinId, setActivePinId] = useState<string | null>(null);
    const displayPinId =
      highlightedPinId !== undefined ? highlightedPinId : activePinId;

    useImperativeHandle(ref, () => ({
      flyToPin(lat, lng, level, options) {
        innerGlobeRef.current?.flyToPin(lat, lng, level, options);
      },
      snapToPin(lat, lng, level, options) {
        innerGlobeRef.current?.snapToPin(lat, lng, level, options);
      },
      snapToDiscoveryBounds(input) {
        innerGlobeRef.current?.snapToDiscoveryBounds(input);
      },
      flyToDiscoveryBounds(input) {
        innerGlobeRef.current?.flyToDiscoveryBounds(input);
      },
      clearPinViewportBias() {
        innerGlobeRef.current?.clearPinViewportBias();
      },
      resetToOverview() {
        innerGlobeRef.current?.resetOverview();
      },
      getPointOfView() {
        return innerGlobeRef.current?.getPointOfView() ?? null;
      },
      getScreenCoords(lat, lng) {
        return innerGlobeRef.current?.getScreenCoords(lat, lng) ?? null;
      },
    }));

    useEffect(() => {
      const seed = initialOpenPinId?.trim();
      if (seed) {
        setActivePinId(seed);
      }
    }, [initialOpenPinId]);

    useEffect(() => {
      if (skipStartupFly || startupFlownRef.current || clusters.length === 0) {
        return;
      }
      const view = resolveGlobeStartupView(clusters);
      if (!view) {
        return;
      }
      startupFlownRef.current = true;
      const timer = window.setTimeout(() => {
        innerGlobeRef.current?.flyToPin(view.lat, view.lng, view.level);
      }, 480);
      return () => window.clearTimeout(timer);
    }, [clusters, skipStartupFly]);

    const handlePinPress = useCallback(
      (pinId: string) => {
        if (pinId === "viewer:here") {
          return;
        }
        const pressedPin = displayPins.find((row) => row.id === pinId);
        if (pressedPin?.pinShape === "dot") {
          setExpandedPinId(pinId);
          innerGlobeRef.current?.flyToPin(
            pressedPin.lat,
            pressedPin.lng,
            "neighborhood",
          );
        } else {
          setExpandedPinId(null);
        }
        if (pinId.startsWith("cluster:")) {
          const memberPinIds = pinId
            .slice("cluster:".length)
            .split("|")
            .map((row) => row.trim())
            .filter(Boolean);
          const memberClusters = memberPinIds
            .map((memberId) => findPinClusterByPinId(clusters, memberId))
            .filter((row): row is PinCluster => row != null);
          if (memberClusters.length === 1) {
            setActivePinId(memberClusters[0]!.pinId);
            onPinPress?.(memberClusters[0]!);
            return;
          }
          if (memberClusters.length > 1) {
            onContextGroupPress?.(memberClusters);
            return;
          }
          const pin = displayPins.find((row) => row.id === pinId);
          if (pin) {
            innerGlobeRef.current?.flyToPin(pin.lat, pin.lng, "city");
          }
          return;
        }
        setActivePinId(pinId);
        const cluster = findPinClusterByPinId(clusters, pinId);
        if (cluster) {
          onPinPress?.(cluster);
          return;
        }
        const pin = displayPins.find((row) => row.id === pinId);
        const eventId = pin?.sourceEventId?.trim();
        if (eventId) {
          const byEvent = findPinClusterByEventId(clusters, eventId);
          if (byEvent) {
            setActivePinId(byEvent.pinId);
            onPinPress?.(byEvent);
          }
        }
      },
      [clusters, displayPins, onContextGroupPress, onPinPress],
    );

    const handleGlobePress = useCallback(
      (coords: { lat: number; lng: number }) => {
        setExpandedPinId(null);
        clearContextBloom();
        onGlobePress?.(coords);
      },
      [onGlobePress],
    );

    return (
      <div
        className={cn("relative flex h-full min-h-0 flex-1 flex-col", className)}
        data-rimvio-globe-hub
        data-rimvio-globe-surface="globe3d"
        data-rimvio-globe-layer-mode={layerMode}
        data-globe-solo-stage={soloStageActive ? "true" : "false"}
      >
        <RimvioGlobe3DClient
          ref={innerGlobeRef}
          pins={globePins}
          tripArcs={tripArcs}
          contextConditionDiscoveryOverlay={gatedDiscoveryOverlay}
          discoveryLensSession={discoveryLensSession}
          viewerLocation={
            gpsEnabled && liveLocation
              ? {
                  lat: liveLocation.lat,
                  lng: liveLocation.lng,
                  accuracyM: liveLocation.accuracyM,
                }
              : null
          }
          activePinId={displayPinId}
          expandedPinId={expandedPinId}
          className="h-full flex-1"
          onPinPress={handlePinPress}
          pinRelocateEnabled={pinRelocateEnabled}
          onPinRelocate={onPinRelocate}
          onGlobePress={handleGlobePress}
          onDetailLevelChange={handleDetailLevelChange}
          renderSuspended={renderSuspended}
          lodgingMarkers={lodgingGlobeMarkers}
          onLodgingMarkerPress={(resourceId, carouselIndex) => {
            const resume = resolveResourceOperationResume(resourceId);
            if (resume?.intent === "book" || resume?.intent === "pay") {
              dispatchGlobeResourceReelFocus({
                contextEventId: resume.contextEventId,
                resourceId: resume.resourceId,
                kind: "lodging",
                carouselIndex,
                surface: "detail",
                source: "map_marker",
                resumeIntent: resume.intent,
              });
              return;
            }
            const marker = lodgingGlobeMarkers.find((row) => row.resourceId === resourceId);
            const contextEventId =
              resume?.contextEventId ??
              (resourceId.includes(":lodging:")
                ? resourceId.slice(0, resourceId.lastIndexOf(":lodging:")).trim()
                : "");
            if (contextEventId) {
              markLodgingResourceComparing({
                contextEventId,
                resourceId,
                label: marker?.label ?? "숙소",
                lat: marker?.lat,
                lng: marker?.lng,
              });
            }
            if (marker) {
              beginContextBloom({
                selected: {
                  id: marker.id,
                  resourceId: marker.resourceId,
                  label: marker.label,
                  lat: marker.lat,
                  lng: marker.lng,
                  pinKind: "lodging",
                },
                contextEventId,
              });
            }
            const scoutFocus = resolveContextAgentGlobeMarkerFocus({ resourceId });
            dispatchGlobeLodgingFocus({
              resourceId,
              carouselIndex,
              source: "map_marker",
            });
            if (scoutFocus) {
              publishContextAgentGlobeMarkerFocus(scoutFocus);
            }
          }}
          eateryMarkers={eateryGlobeMarkers}
          onEateryMarkerPress={(resourceId, carouselIndex) => {
            const marker = eateryGlobeMarkers.find((row) => row.resourceId === resourceId);
            if (marker) {
              const pinKind = marker.resourceId.includes(":activity:")
                ? ("activity" as const)
                : marker.resourceId.includes(":amenity:")
                  ? ("amenity" as const)
                  : ("eatery" as const);
              beginContextBloom({
                selected: {
                  id: marker.id,
                  resourceId: marker.resourceId,
                  label: marker.label,
                  lat: marker.lat,
                  lng: marker.lng,
                  pinKind,
                },
                contextEventId:
                  resolveContextEventIdFromResourceId(marker.resourceId) ??
                  focusedContextEventId,
              });
            }
            const scoutFocus = resolveContextAgentGlobeMarkerFocus({ resourceId });
            dispatchGlobeEateryFocus({
              resourceId,
              carouselIndex,
              source: "map_marker",
            });
            if (scoutFocus) {
              publishContextAgentGlobeMarkerFocus(scoutFocus);
              dispatchGlobePlaceOntologyFocus({
                contextEventId: scoutFocus.contextEventId,
                placeId: scoutFocus.placeId,
                kind: scoutFocus.kind,
                lat: scoutFocus.lat,
                lng: scoutFocus.lng,
                title: scoutFocus.title,
                surface: "detail",
              });
            }
          }}
          brainSurfaceMarkers={brainSurfaceMarkers}
          onBrainSurfaceMarkerPress={onBrainSurfaceMarkerPress}
          hubAnchors={
            mapMediaFocusOpen || !contextHubAnchor ? [] : [contextHubAnchor]
          }
          onContextHubAnchorPress={(contextEventId) => {
            dispatchGlobeContextHubOpen({ contextEventId, source: "map_anchor" });
            onContextHubAnchorPress?.(contextEventId);
          }}
          showInteractionHint={showInteractionHint}
          contextAgentPickMode={contextAgentPickMode}
        />

        <div
          className="pointer-events-none absolute inset-x-3 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.75rem))] z-20 flex justify-end"
          data-globe-reality-object-card-slot
        >
          <GlobeRealityObjectCard
            fallbackContextEventId={focusedContextEventId}
            event={
              focusedContextEventId
                ? (eventsById.get(focusedContextEventId) ?? null)
                : null
            }
          />
        </div>

        {clusters.length === 0 ? (
          layerMode === "discovery" ? (
            <p
              className="pointer-events-none absolute inset-x-0 top-[max(4.5rem,env(safe-area-inset-top))] z-10 mx-auto w-fit max-w-[85%] rounded-full bg-white/90 px-3.5 py-1.5 text-center text-[12px] font-medium text-[#8b95a1] shadow-sm backdrop-blur-md"
              data-rimvio-globe-hub-empty
            >
              {copy.globe.externalDiscoveryEmpty}
            </p>
          ) : (
            <div
              className="absolute inset-x-4 bottom-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] z-10 flex max-h-[min(72dvh,34rem)] flex-col items-center gap-2.5 overflow-y-auto rounded-[1.35rem] bg-white/95 px-5 py-4 text-center shadow-lg ring-1 ring-[#0220470a] backdrop-blur-md"
              data-rimvio-globe-hub-empty
            >
              <p className="text-[17px] font-semibold tracking-tight text-[#191f28]">
                {copy.globe.emptyFirstTitle}
              </p>
              <p className="max-w-[18rem] text-[13px] leading-relaxed text-[#6b7684]">
                {copy.globe.emptyFirstBody}
              </p>
              <GlobeContextFirstDemo className="mt-1" />
              <button
                type="button"
                onClick={() => dispatchOpenCaptureSheet()}
                className="rimvio-accent-submit-btn mt-1 w-full max-w-[14rem] rounded-full py-3 text-[14px] font-semibold text-white shadow-sm active:scale-[0.98]"
              >
                {copy.globe.emptyFirstCta}
              </button>
              <Link
                href="/peers"
                className="py-1 text-[13px] font-medium text-[#3182f6] active:opacity-70"
              >
                {copy.globe.emptyFirstPeersLink}
              </Link>
              <RimvioStarterExampleChips className="mt-1 w-full" />
            </div>
          )
        ) : null}
      </div>
    );
  }),
);

/** Globe-first home — 3D earth only. */
export const RimvioGlobeHub = memo(function RimvioGlobeHub({
  className,
  globeRef,
  initialOpenPinId,
  initialRecallEventId,
  onRecallEventId,
  highlightedPinId,
  onPinPress,
  onContextGroupPress,
  pinRelocateEnabled,
  onPinRelocate,
  timeFilter = "all",
  peopleFilter = null,
  pinCoordOverrides,
  onGlobePress,
  onClustersSnapshot,
  onDetailLevelChange,
  bridgeGhostClusters,
  renderSuspended,
  focusedContextEventId,
  onContextHubAnchorPress,
  showInteractionHint = true,
  layerMode = "personal",
  lodgingDiscoveryCards = null,
  eateryDiscoveryCards = null,
  brainSurfaceMarkers = [],
  onBrainSurfaceMarkerPress,
  brainSurfaceTraceArcs = [],
  realityBridgeArcs = [],
  contextConditionDiscoveryOverlay = null,
  discoveryLensSession = null,
  contextAgentPickMode = false,
}: RimvioGlobeHubProps) {
  const { ready, eventsById, personalPinRevision } = useGlobeEventSnapshot();
  const liveLocation = useLiveLocationSnapshot();
  const iosPwaGuards = useIosPwaMemoryGuards();
  const [layerPolicyRevision, setLayerPolicyRevision] = useState(0);
  useEffect(() => {
    return subscribeGlobeProjectionLayerPolicy(() => {
      setLayerPolicyRevision((value) => value + 1);
    });
  }, []);
  const [discoveryPinsReady, setDiscoveryPinsReady] = useState(
    () => layerMode !== "discovery",
  );

  useEffect(() => {
    if (layerMode !== "discovery") {
      setDiscoveryPinsReady(!iosPwaGuards);
      return;
    }
    if (!iosPwaGuards) {
      setDiscoveryPinsReady(true);
      return;
    }
    setDiscoveryPinsReady(false);
    const timer = window.setTimeout(
      () => setDiscoveryPinsReady(true),
      iosPwaDiscoveryPinsDelayMs(),
    );
    return () => window.clearTimeout(timer);
  }, [iosPwaGuards, layerMode]);

  const fieldDiscoveryReveal = useGlobeFieldDiscoveryReveal();

  const discoveryPinsEnabled = layerMode === "discovery" && discoveryPinsReady;

  const { traces: externalTraces } = useGlobePinsPlatformExternal({
    enabled: discoveryPinsEnabled,
    lat: liveLocation?.lat ?? null,
    lng: liveLocation?.lng ?? null,
  });
  const { intents: marketDiscoveryIntents } = useMarketDiscoveryPins({
    enabled: discoveryPinsEnabled,
    lat: liveLocation?.lat ?? null,
    lng: liveLocation?.lng ?? null,
  });
  const { graph } = useExperienceGraph(ready ? eventsById : undefined);
  const recallOpenedRef = useRef(false);
  const onClustersSnapshotRef = useRef(onClustersSnapshot);

  useEffect(() => {
    onClustersSnapshotRef.current = onClustersSnapshot;
  }, [onClustersSnapshot]);

  const clusters = useMemo(() => {
    if (!ready) {
      return [];
    }
    const all = projectPinClustersFromGraph({
      volumes: graph.volumes,
      eventsById,
    });
    const filtered =
      layerMode === "discovery"
        ? all
        : all.filter(
            (cluster) =>
              matchesGlobeContextTimeFilter(cluster.startedAtIso, timeFilter) &&
              matchesGlobeContextPeopleFilter(
                cluster.eventId,
                peopleFilter,
                eventsById,
              ),
          );
    const base = resolveGlobeClustersForLayerMode({
      mode: layerMode,
      personalClusters: filtered,
      bridgeGhostClusters: bridgeGhostClusters,
      externalTraces,
      marketDiscoveryIntents,
    });
    const fieldRevealIntents = filterFieldRevealIntents(fieldDiscoveryReveal);
    const fieldRevealPlaces = filterFieldRevealPlaceClusters(fieldDiscoveryReveal);
    if (fieldRevealIntents.length === 0 && fieldRevealPlaces.length === 0) {
      return filterPinClustersForLayerPolicy(
        base,
        readGlobeProjectionLayerPolicy(),
      );
    }
    const existingPinIds = new Set(base.map((cluster) => cluster.pinId));
    const marketOverlay = projectMarketDiscoveryPinClusters(fieldRevealIntents);
    const extra = [...marketOverlay, ...fieldRevealPlaces].filter(
      (cluster) => !existingPinIds.has(cluster.pinId),
    );
    return filterPinClustersForLayerPolicy(
      [...base, ...extra],
      readGlobeProjectionLayerPolicy(),
    );
  }, [
    ready,
    graph.volumes,
    eventsById,
    personalPinRevision,
    timeFilter,
    peopleFilter,
    layerMode,
    bridgeGhostClusters,
    externalTraces,
    marketDiscoveryIntents,
    fieldDiscoveryReveal,
    layerPolicyRevision,
  ]);

  const displayClusters = clusters;

  useEffect(() => {
    onClustersSnapshotRef.current?.(displayClusters);
  }, [displayClusters]);

  useEffect(() => {
    if (!initialRecallEventId?.trim()) {
      recallOpenedRef.current = false;
    }
  }, [initialRecallEventId]);

  useEffect(() => {
    if (!ready || recallOpenedRef.current) {
      return;
    }
    const eventId = initialRecallEventId?.trim();
    if (!eventId) {
      return;
    }
    recallOpenedRef.current = true;
    // Prefer recall handler so Context AI PromptFrame opens (onPinPress alone
    // only focuses the cluster and leaves the assistant closed).
    if (onRecallEventId) {
      onRecallEventId(eventId);
      return;
    }
    if (!onPinPress) {
      return;
    }
    const cluster = findPinClusterByEventId(displayClusters, eventId);
    if (cluster) {
      onPinPress(cluster);
    }
  }, [ready, displayClusters, initialRecallEventId, onPinPress, onRecallEventId]);

  if (!ready) {
    return (
      <div
        className={cn(
          "rimvio-globe-space rimvio-globe-space--toss flex min-h-[60vh] flex-1 items-center justify-center px-6 text-center text-[14px] text-[#8b95a1]",
          className,
        )}
        data-rimvio-globe-hub-loading
      >
        지구 불러오는 중…
      </div>
    );
  }

  return (
    <RimvioGlobeHubBody
      ref={globeRef}
      className={className}
      clusters={displayClusters}
      eventsById={eventsById}
      initialOpenPinId={initialOpenPinId}
      highlightedPinId={highlightedPinId}
      onPinPress={onPinPress}
      onContextGroupPress={onContextGroupPress}
      pinRelocateEnabled={pinRelocateEnabled}
      onPinRelocate={onPinRelocate}
      pinCoordOverrides={pinCoordOverrides}
      onGlobePress={onGlobePress}
      onDetailLevelChange={onDetailLevelChange}
      skipStartupFly={Boolean(
        initialRecallEventId?.trim() || initialOpenPinId?.trim(),
      )}
      renderSuspended={renderSuspended}
      focusedContextEventId={focusedContextEventId}
      realityBridgeArcs={realityBridgeArcs}
      contextConditionDiscoveryOverlay={contextConditionDiscoveryOverlay}
      discoveryLensSession={discoveryLensSession}
      onContextHubAnchorPress={onContextHubAnchorPress}
      showInteractionHint={showInteractionHint}
      layerMode={layerMode}
      lodgingDiscoveryCards={lodgingDiscoveryCards}
      eateryDiscoveryCards={eateryDiscoveryCards}
      brainSurfaceMarkers={brainSurfaceMarkers}
      onBrainSurfaceMarkerPress={onBrainSurfaceMarkerPress}
      brainSurfaceTraceArcs={brainSurfaceTraceArcs}
      contextAgentPickMode={contextAgentPickMode}
    />
  );
});
