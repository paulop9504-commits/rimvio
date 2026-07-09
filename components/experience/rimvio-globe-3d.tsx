"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Globe from "globe.gl";
import type { GlobeInstance } from "globe.gl";
import { createGestureUpdateCoalescer } from "@/lib/globe/coalesce-gesture-updates";
import { GLOBE_OVERVIEW_POINT_OF_VIEW } from "@/lib/experience-graph/globe-overview-view";
import { createGlobe3dPinElement, createGlobe3dClusterPinElement, createGlobe3dDotPinElement, createGlobe3dMarketPinElement } from "@/lib/globe/create-globe-3d-pin-element";
import { createGlobeLodgingMarkerElement } from "@/lib/globe/create-globe-lodging-marker-element";
import { createGlobeEateryMarkerElement } from "@/lib/globe/create-globe-eatery-marker-element";
import { createGlobeBrainSurfaceMarkerElement } from "@/lib/globe/create-globe-brain-surface-marker-element";
import { createGlobeContextHubAnchorElement } from "@/lib/globe/create-globe-context-hub-anchor-element";
import { createGlobe3dViewerPinElement } from "@/lib/globe/create-globe-3d-viewer-pin-element";
import { accuracyMetersToRingDegrees } from "@/lib/globe/accuracy-ring-degrees";
import { discoveryRadiusMetersToRingDegrees } from "@/lib/globe/discovery-radius-ring-degrees";
import { buildDiscoveryLensLabelRows } from "@/lib/globe/discovery-lens/build-discovery-lens-label-rows";
import type { DiscoveryLensLabelRow } from "@/lib/globe/discovery-lens/build-discovery-lens-label-rows";
import { resolveLocalDiscoveryRouteArcAltitude } from "@/lib/globe/context-condition-ai/build-context-condition-discovery-overlay";
import type { ContextConditionDiscoveryOverlay } from "@/lib/globe/context-condition-ai/context-condition-discovery-overlay-types";
import { GLOBE_TILE_MAX_ZOOM } from "@/lib/globe/globe-tile-constants";
import { globeTileEngineUrl } from "@/lib/globe/globe-tile-engine-url";
import { applyRimvioGlobeTileTextureFiltering } from "@/lib/globe/apply-rimvio-globe-tile-texture-filtering";
import { disposeGlobeGpuResources } from "@/lib/globe/dispose-globe-gpu-resources";
import { useGlobeAnimationPower } from "@/hooks/use-globe-animation-power";
import { useGlobeOverviewTexture } from "@/hooks/use-globe-equirect-texture";
import { tuneGlobeOrbitControls } from "@/lib/globe/tune-globe-orbit-controls";
import { useGlobeFocalPinch } from "@/hooks/use-globe-focal-pinch";
import { resolveTripArcAltitude } from "@/lib/globe/resolve-trip-arc-altitude";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
import { shouldApplyGlobeOverviewTexture } from "@/lib/globe/globe-overview-texture-altitude";
import {
  resolveGlobePixelRatioCap,
  resolveGlobeRendererConfig,
  shouldDisableGlobeCanvasCssFilter,
} from "@/lib/globe/resolve-globe-renderer-config";
import { applyGlobePinUiScale } from "@/lib/globe/apply-globe-pin-ui-scale";
import { resolveGlobePinUiScaleBlended } from "@/lib/globe/resolve-globe-pin-ui-scale";
import type { GlobeViewerLocation } from "@/lib/globe/globe-viewer-location-types";
import { clampGpsAccuracyMeters } from "@/lib/globe/format-gps-accuracy-label";
import {
  altitudeForGlobeDetailLevel,
  GLOBE_MIN_SAFE_ALTITUDE,
  resolveGlobeDetailLevel,
  type GlobeDetailLevel,
} from "@/lib/globe/globe-zoom-levels";
import type { GlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";
import type { GlobeContextHubMapAnchor } from "@/lib/globe/context-hub/context-hub-globe-anchor-types";
import { isGlobeContextHubMapAnchor } from "@/lib/globe/context-hub/context-hub-globe-anchor-types";
import { isGlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";
import type { GlobeEateryMapMarker } from "@/lib/globe/eatery/eatery-globe-marker-types";
import { isGlobeEateryMapMarker } from "@/lib/globe/eatery/eatery-globe-marker-types";
import { shouldRenderLodgingGlobeMarkers } from "@/lib/globe/context-hub/project-lodging-globe-markers";
import { shouldRenderEateryGlobeMarkers } from "@/lib/globe/eatery/project-eatery-globe-markers";
import { shouldRenderContextHubGlobeAnchor } from "@/lib/globe/context-hub/project-context-hub-globe-anchor";
import {
  isBrainSurfaceProjectionCandidate,
  isClassifiedGlobePin,
  mergeGlobeHtmlElements,
  readGlobeHtmlLat,
  readGlobeHtmlLng,
  type GlobeHtmlMapElement,
} from "@/lib/globe/globe-html-map-elements";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import type { GlobeTripArc } from "@/lib/globe/project-trip-leg-arcs";
import type { GlobeContextWarmthPoint } from "@/lib/globe/globe-context-warmth-types";
import { syncGlobeContextWarmthLayer } from "@/lib/globe/sync-globe-context-warmth-layer";
import { screenPointToGlobeCoords } from "@/lib/globe/screen-point-to-globe-coords";
import { resolveGlobeOffsetForPinViewportY } from "@/lib/globe/map-anchored-overlay-layout";
import { cn } from "@/lib/utils";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

const FLY_MS = 1400;

function syncGlobeViewport(
  globe: GlobeInstance,
  root: HTMLElement,
): void {
  const width = root.clientWidth;
  const height = root.clientHeight;
  if (width > 0 && height > 0) {
    globe.width(width);
    globe.height(height);
    globe.globeOffset([0, 0]);
  }
}

function applyGlobePinViewportBias(
  globe: GlobeInstance,
  root: HTMLElement | null,
  pinViewportY?: number,
): void {
  const height = root?.clientHeight ?? 0;
  if (height <= 0) {
    globe.globeOffset([0, 0]);
    return;
  }
  globe.globeOffset(
    resolveGlobeOffsetForPinViewportY({ viewportHeight: height, pinViewportY }),
  );
}

export type GlobeFlyToPinOptions = {
  /** 0.5 = center. ~0.58 places the geo pin lower — room for map overlays above. */
  pinViewportY?: number;
};

export type RimvioGlobe3DHandle = {
  flyToPin: (
    lat: number,
    lng: number,
    level?: Extract<
      GlobeDetailLevel,
      "region" | "city" | "neighborhood" | "street" | "pin"
    >,
    options?: GlobeFlyToPinOptions,
  ) => void;
  /** Instant POV — no fly animation (context agent bind). */
  snapToPin: (
    lat: number,
    lng: number,
    level?: Extract<
      GlobeDetailLevel,
      "region" | "city" | "neighborhood" | "street" | "pin"
    >,
    options?: GlobeFlyToPinOptions,
  ) => void;
  snapToDiscoveryBounds: (input: {
    centerLat: number;
    centerLng: number;
    altitude: number;
    pinViewportY?: number;
  }) => void;
  flyToDiscoveryBounds: (input: {
    centerLat: number;
    centerLng: number;
    altitude: number;
    pinViewportY?: number;
  }) => void;
  clearPinViewportBias: () => void;
  resetOverview: () => void;
  getPointOfView: () => {
    lat: number;
    lng: number;
    altitude: number;
  } | null;
  getScreenCoords: (
    lat: number,
    lng: number,
  ) => { x: number; y: number } | null;
  /** Jump camera without fly animation — vector → 3D handoff. */
  syncPointOfView: (lat: number, lng: number, altitude: number) => void;
};

export type RimvioGlobe3DProps = {
  pins: readonly ClassifiedGlobePin[];
  tripArcs?: readonly GlobeTripArc[];
  /** Context Condition AI — search radius ring + POI walk route. */
  contextConditionDiscoveryOverlay?: ContextConditionDiscoveryOverlay | null;
  /** Discovery lens POV rings (a/b/c). */
  discoveryLensSession?: import("@/lib/globe/discovery-lens/types").DiscoveryLensSession | null;
  /** Soft trace-density wash — overview/region only. */
  contextWarmthPoints?: readonly GlobeContextWarmthPoint[];
  contextWarmthEnabled?: boolean;
  viewerLocation?: GlobeViewerLocation | null;
  activePinId?: string | null;
  /** Dot tap expansion — slot card popout animation. */
  expandedPinId?: string | null;
  onPinPress?: (pinId: string) => void;
  /** Long-press drag — personal globe context pins only. */
  pinRelocateEnabled?: boolean;
  onPinRelocate?: (input: {
    pinId: string;
    sourceEventId: string;
    lat: number;
    lng: number;
  }) => void;
  /** Tap empty globe — shared ROOM pin placement. */
  onGlobePress?: (coords: { lat: number; lng: number }) => void;
  hintText?: string;
  /** Idle pinch/drag coach — off on globe home where capture dock owns the bottom. */
  showInteractionHint?: boolean;
  onDetailLevelChange?: (level: GlobeDetailLevel) => void;
  onPointOfViewChange?: (pov: {
    lat: number;
    lng: number;
    altitude: number;
    detailLevel: GlobeDetailLevel;
  }) => void;
  /** False while MapLibre vector surface owns gestures. */
  interactionEnabled?: boolean;
  /** Pause WebGL when sheets cover the map or tab is hidden. */
  renderSuspended?: boolean;
  /** Ranked lodging markers — View only; no fetch. */
  lodgingMarkers?: readonly GlobeLodgingMapMarker[];
  onLodgingMarkerPress?: (resourceId: string, carouselIndex: number) => void;
  /** Ranked eatery markers — View only; no fetch. */
  eateryMarkers?: readonly GlobeEateryMapMarker[];
  onEateryMarkerPress?: (resourceId: string, carouselIndex: number) => void;
  /** Temporary brain-complete candidates layered over the globe. */
  brainSurfaceMarkers?: readonly BrainSurfaceProjectionCandidate[];
  onBrainSurfaceMarkerPress?: (candidateId: string) => void;
  /** Connected context hub opener — map pill, not pin info sheet. */
  hubAnchors?: readonly GlobeContextHubMapAnchor[];
  onContextHubAnchorPress?: (contextEventId: string) => void;
  /** 맥락 어시스턴트 pick — pins yield pan/zoom until tap. */
  contextAgentPickMode?: boolean;
  className?: string;
};

/** WebGL Earth — Google Earth orbit, tile zoom, fly-to-place. */
export const RimvioGlobe3D = memo(
  forwardRef<RimvioGlobe3DHandle, RimvioGlobe3DProps>(function RimvioGlobe3D(
    {
      pins,
      tripArcs = [],
      contextConditionDiscoveryOverlay = null,
      discoveryLensSession = null,
      contextWarmthPoints = [],
      contextWarmthEnabled = false,
      viewerLocation = null,
      activePinId = null,
      expandedPinId = null,
      onPinPress,
      pinRelocateEnabled = false,
      onPinRelocate,
      onGlobePress,
      hintText,
      showInteractionHint = true,
      onDetailLevelChange,
      onPointOfViewChange,
      interactionEnabled = true,
      renderSuspended = false,
      lodgingMarkers = [],
      onLodgingMarkerPress,
      eateryMarkers = [],
      onEateryMarkerPress,
      brainSurfaceMarkers = [],
      onBrainSurfaceMarkerPress,
      hubAnchors = [],
      onContextHubAnchorPress,
      contextAgentPickMode = false,
      className,
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const contextAgentPickModeRef = useRef(contextAgentPickMode);
    const shellRef = useRef<HTMLDivElement>(null);
    const globeRef = useRef<GlobeInstance | null>(null);
    const onPinPressRef = useRef(onPinPress);
    const onLodgingMarkerPressRef = useRef(onLodgingMarkerPress);
    const onEateryMarkerPressRef = useRef(onEateryMarkerPress);
    const onBrainSurfaceMarkerPressRef = useRef(onBrainSurfaceMarkerPress);
    const onContextHubAnchorPressRef = useRef(onContextHubAnchorPress);
    const onPinRelocateRef = useRef(onPinRelocate);
    const pinRelocateEnabledRef = useRef(pinRelocateEnabled);
    const onGlobePressRef = useRef(onGlobePress);
    const onDetailLevelChangeRef = useRef(onDetailLevelChange);
    const onPointOfViewChangeRef = useRef(onPointOfViewChange);
    const activePinIdRef = useRef(activePinId);
    const expandedPinIdRef = useRef(expandedPinId);
    const pinsRef = useRef(pins);
    const lodgingMarkersRef = useRef(lodgingMarkers);
    const eateryMarkersRef = useRef(eateryMarkers);
    const brainSurfaceMarkersRef = useRef(brainSurfaceMarkers);
    const hubAnchorsRef = useRef(hubAnchors);
    const tripArcsRef = useRef(tripArcs);
    const contextWarmthPointsRef = useRef(contextWarmthPoints);
    const contextWarmthEnabledRef = useRef(contextWarmthEnabled);
    const warmthAltitudeRef = useRef<number>(GLOBE_OVERVIEW_POINT_OF_VIEW.altitude);
    const warmthDetailRef = useRef<GlobeDetailLevel>("space");
    const viewerLocationRef = useRef(viewerLocation);
    const discoveryLensSessionRef = useRef(discoveryLensSession);
    const overviewTextureUrlRef = useRef<string | null>(null);
    const [globeReady, setGlobeReady] = useState(false);
    const { textureUrl: overviewTextureUrl } = useGlobeOverviewTexture();
    overviewTextureUrlRef.current = overviewTextureUrl;

    const [relocatingPinId, setRelocatingPinId] = useState<string | null>(null);
    const relocatingPinIdRef = useRef<string | null>(null);
    const pinPressLockRef = useRef(false);
    const controlsBlockedRef = useRef(false);
    const relocatePreviewRef = useRef<{
      pinId: string;
      lat: number;
      lng: number;
    } | null>(null);

    const beginPinRelocateRef = useRef<(pinId: string) => void>(() => {});

    const beginPinRelocate = useCallback((pinId: string) => {
      if (!pinRelocateEnabledRef.current) {
        return;
      }
      const pin = pinsRef.current.find((row) => row.id === pinId);
      if (!pin?.sourceEventId?.trim()) {
        return;
      }
      relocatingPinIdRef.current = pinId;
      relocatePreviewRef.current = { pinId, lat: pin.lat, lng: pin.lng };
      controlsBlockedRef.current = true;
      setRelocatingPinId(pinId);
      const globe = globeRef.current;
      if (globe) {
        globe.controls().enabled = false;
      }
    }, []);

    beginPinRelocateRef.current = beginPinRelocate;

    const lockGlobeControlsRef = useRef(() => {});
    const unlockGlobeControlsRef = useRef(() => {});
    const suppressGlobeClickUntilRef = useRef(0);
    const pinUiScaleRef = useRef(1);
    const applyZoomPovRef = useRef<
      (pov: { lat: number; lng: number; altitude: number }) => void
    >(() => {});
    const gestureActiveRef = useRef(false);
    const pendingDetailLevelRef = useRef<ReturnType<typeof resolveGlobeDetailLevel> | null>(
      null,
    );
    const pendingPinSyncRef = useRef(false);
    const flushDeferredGlobeVisualsRef = useRef<(() => void) | null>(null);

    lockGlobeControlsRef.current = () => {
      pinPressLockRef.current = true;
      controlsBlockedRef.current = true;
      suppressGlobeClickUntilRef.current = Date.now() + 900;
      const globe = globeRef.current;
      if (globe) {
        globe.controls().enabled = false;
      }
    };

    unlockGlobeControlsRef.current = () => {
      pinPressLockRef.current = false;
      controlsBlockedRef.current = Boolean(relocatingPinIdRef.current);
      if (!relocatingPinIdRef.current) {
        const globe = globeRef.current;
        if (globe) {
          globe.controls().enabled = true;
        }
      }
    };

    useEffect(() => {
      if (!relocatingPinId) {
        return;
      }
      const root = rootRef.current;
      const globe = globeRef.current;
      if (!root || !globe) {
        return;
      }

      const relocateMoveCoalescer = createGestureUpdateCoalescer<{
        pinId: string;
        lat: number;
        lng: number;
      }>((coords) => {
        relocatePreviewRef.current = coords;
        const rows = (globe.htmlElementsData() as GlobeHtmlMapElement[]).map(
          (element) => {
            if (!isClassifiedGlobePin(element) || element.id !== coords.pinId) {
              return element;
            }
            return { ...element, lat: coords.lat, lng: coords.lng };
          },
        );
        globe.htmlElementsData(rows);
      });

      const finishRelocate = (event: PointerEvent) => {
        relocateMoveCoalescer.flushNow();
        const pinId = relocatingPinIdRef.current;
        if (!pinId) {
          return;
        }
        const preview = relocatePreviewRef.current;
        const pin = pinsRef.current.find((row) => row.id === pinId);
        const hit = screenPointToGlobeCoords(globe, root, event.clientX, event.clientY);
        const lat = hit?.lat ?? preview?.lat;
        const lng = hit?.lng ?? preview?.lng;
        if (
          lat !== undefined &&
          lng !== undefined &&
          pin?.sourceEventId?.trim()
        ) {
          onPinRelocateRef.current?.({
            pinId,
            sourceEventId: pin.sourceEventId.trim(),
            lat,
            lng,
          });
        }
        relocatingPinIdRef.current = null;
        relocatePreviewRef.current = null;
        controlsBlockedRef.current = false;
        setRelocatingPinId(null);
        globe.controls().enabled = true;
        root.querySelectorAll<HTMLElement>("[data-globe-pin-relocating]").forEach(
          (element) => {
            element.classList.remove("rimvio-globe-3d-pin--relocating");
            element.removeAttribute("data-globe-pin-relocating");
          },
        );
      };

      const onMove = (event: PointerEvent) => {
        event.preventDefault();
        const coords = screenPointToGlobeCoords(
          globe,
          root,
          event.clientX,
          event.clientY,
        );
        if (!coords) {
          return;
        }
        relocateMoveCoalescer.push({
          pinId: relocatingPinId,
          lat: coords.lat,
          lng: coords.lng,
        });
      };

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", finishRelocate, { passive: false });
      window.addEventListener("pointercancel", finishRelocate, { passive: false });
      return () => {
        relocateMoveCoalescer.cancel();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", finishRelocate);
        window.removeEventListener("pointercancel", finishRelocate);
        globe.controls().enabled = true;
      };
    }, [relocatingPinId]);

    onPinPressRef.current = onPinPress;
    onLodgingMarkerPressRef.current = onLodgingMarkerPress;
    onEateryMarkerPressRef.current = onEateryMarkerPress;
    onBrainSurfaceMarkerPressRef.current = onBrainSurfaceMarkerPress;
    onContextHubAnchorPressRef.current = onContextHubAnchorPress;
    onPinRelocateRef.current = onPinRelocate;
    pinRelocateEnabledRef.current = pinRelocateEnabled;
    onGlobePressRef.current = onGlobePress;
    onDetailLevelChangeRef.current = onDetailLevelChange;
    onPointOfViewChangeRef.current = onPointOfViewChange;
    activePinIdRef.current = activePinId;
    expandedPinIdRef.current = expandedPinId;
    pinsRef.current = pins;
    lodgingMarkersRef.current = lodgingMarkers;
    eateryMarkersRef.current = eateryMarkers;
    brainSurfaceMarkersRef.current = brainSurfaceMarkers;
    hubAnchorsRef.current = hubAnchors;
    tripArcsRef.current = tripArcs;
    contextWarmthPointsRef.current = contextWarmthPoints;
    contextWarmthEnabledRef.current = contextWarmthEnabled;
    contextAgentPickModeRef.current = contextAgentPickMode;
    discoveryLensSessionRef.current = discoveryLensSession;

    const syncContextWarmthRef = useRef(() => {});
    const syncHtmlElementsRef = useRef(() => {});
    syncHtmlElementsRef.current = () => {
      const globe = globeRef.current;
      const root = rootRef.current;
      if (!globe || !root) {
        return;
      }
      const showLodging = shouldRenderLodgingGlobeMarkers(warmthDetailRef.current);
      const showEatery = shouldRenderEateryGlobeMarkers(warmthDetailRef.current);
      const showHubAnchors = shouldRenderContextHubGlobeAnchor(warmthDetailRef.current);
      globe.htmlElementsData(
        mergeGlobeHtmlElements({
          pins: pinsRef.current,
          lodgingMarkers: lodgingMarkersRef.current,
          eateryMarkers: eateryMarkersRef.current,
          brainSurfaceMarkers: brainSurfaceMarkersRef.current,
          hubAnchors: hubAnchorsRef.current,
          showLodgingMarkers: showLodging,
          showEateryMarkers: showEatery,
          showBrainSurfaceMarkers: brainSurfaceMarkersRef.current.length > 0,
          showHubAnchors,
        }),
      );
      globe.labelsData(
        buildDiscoveryLensLabelRows(
          discoveryLensSessionRef.current,
          warmthDetailRef.current,
        ),
      );
      applyGlobePinUiScale(root, pinUiScaleRef.current);
      shellRef.current?.setAttribute(
        "data-globe-lodging-markers",
        showLodging && lodgingMarkersRef.current.length > 0 ? "visible" : "hidden",
      );
    };
    syncContextWarmthRef.current = () => {
      const globe = globeRef.current;
      if (!globe) {
        shellRef.current?.setAttribute("data-globe-context-warmth", "off");
        return;
      }
      const state = syncGlobeContextWarmthLayer({
        globe,
        enabled: contextWarmthEnabledRef.current,
        points: contextWarmthPointsRef.current,
        altitude: warmthAltitudeRef.current,
        detailLevel: warmthDetailRef.current,
      });
      shellRef.current?.setAttribute(
        "data-globe-context-warmth",
        state.active ? "active" : "off",
      );
      shellRef.current?.setAttribute(
        "data-globe-context-warmth-points",
        String(state.pointCount),
      );
    };
    viewerLocationRef.current = viewerLocation;

    useImperativeHandle(ref, () => ({
      flyToPin(lat, lng, level = "neighborhood", options?) {
        const globe = globeRef.current;
        const root = rootRef.current;
        if (!globe) {
          return;
        }
        globe.pointOfView(
          { lat, lng, altitude: altitudeForGlobeDetailLevel(level) },
          FLY_MS,
        );
        applyGlobePinViewportBias(globe, root, options?.pinViewportY);
      },
      snapToPin(lat, lng, level = "street", options?) {
        const globe = globeRef.current;
        const root = rootRef.current;
        if (!globe) {
          return;
        }
        globe.pointOfView(
          { lat, lng, altitude: altitudeForGlobeDetailLevel(level) },
          0,
        );
        applyGlobePinViewportBias(globe, root, options?.pinViewportY);
      },
      snapToDiscoveryBounds(input) {
        const globe = globeRef.current;
        const root = rootRef.current;
        if (!globe) {
          return;
        }
        globe.pointOfView(
          {
            lat: input.centerLat,
            lng: input.centerLng,
            altitude: input.altitude,
          },
          0,
        );
        applyGlobePinViewportBias(globe, root, input.pinViewportY ?? 0.62);
      },
      flyToDiscoveryBounds(input) {
        const globe = globeRef.current;
        const root = rootRef.current;
        if (!globe) {
          return;
        }
        globe.pointOfView(
          {
            lat: input.centerLat,
            lng: input.centerLng,
            altitude: input.altitude,
          },
          FLY_MS * 1.4,
        );
        applyGlobePinViewportBias(globe, root, input.pinViewportY ?? 0.62);
      },
      clearPinViewportBias() {
        const globe = globeRef.current;
        if (!globe) {
          return;
        }
        globe.globeOffset([0, 0]);
      },
      resetOverview() {
        const globe = globeRef.current;
        if (!globe) {
          return;
        }
        globe.globeOffset([0, 0]);
        globe.pointOfView({ ...GLOBE_OVERVIEW_POINT_OF_VIEW }, FLY_MS);
      },
      syncPointOfView(lat, lng, altitude) {
        const globe = globeRef.current;
        if (!globe) {
          return;
        }
        globe.pointOfView(
          {
            lat,
            lng,
            altitude: Math.max(GLOBE_MIN_SAFE_ALTITUDE, altitude),
          },
          0,
        );
      },
      getPointOfView() {
        const globe = globeRef.current;
        if (!globe) {
          return null;
        }
        const pov = globe.pointOfView();
        if (
          !Number.isFinite(pov.lat) ||
          !Number.isFinite(pov.lng) ||
          !Number.isFinite(pov.altitude)
        ) {
          return null;
        }
        return { lat: pov.lat, lng: pov.lng, altitude: pov.altitude };
      },
      getScreenCoords(lat, lng) {
        const globe = globeRef.current;
        if (!globe || !Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }
        const coords = globe.getScreenCoords(lat, lng);
        if (
          !coords ||
          !Number.isFinite(coords.x) ||
          !Number.isFinite(coords.y)
        ) {
          return null;
        }
        return { x: coords.x, y: coords.y };
      },
    }));

    useEffect(() => {
      const root = rootRef.current;
      if (!root) {
        return;
      }

      const globe = new Globe(root, {
        animateIn: true,
        waitForGlobeReady: true,
        rendererConfig: resolveGlobeRendererConfig(),
      })
        .backgroundColor("rgba(0,0,0,0)")
        .globeTileEngineUrl(globeTileEngineUrl)
        .globeTileEngineMaxLevel(GLOBE_TILE_MAX_ZOOM)
        .showGraticules(false)
        .showAtmosphere(true)
        .atmosphereColor(GLOBE_TOSS_THEME.atmosphere)
        .atmosphereAltitude(GLOBE_TOSS_THEME.atmosphereAltitude)
        .labelsData([])
        .labelLat((row: object) => (row as DiscoveryLensLabelRow).lat)
        .labelLng((row: object) => (row as DiscoveryLensLabelRow).lng)
        .labelText((row: object) => (row as DiscoveryLensLabelRow).text)
        .labelSize((row: object) =>
          (row as DiscoveryLensLabelRow).active ? 1.15 : 0.9,
        )
        .labelColor((row: object) =>
          (row as DiscoveryLensLabelRow).active
            ? "rgba(0, 113, 227, 0.95)"
            : "rgba(29, 29, 31, 0.72)",
        )
        .labelDotRadius(0.22)
        .labelDotOrientation("right")
        .labelAltitude(0.002)
        .htmlElementsData(
          mergeGlobeHtmlElements({
            pins: pinsRef.current,
            lodgingMarkers: lodgingMarkersRef.current,
            eateryMarkers: eateryMarkersRef.current,
            brainSurfaceMarkers: brainSurfaceMarkersRef.current,
            hubAnchors: hubAnchorsRef.current,
            showLodgingMarkers: shouldRenderLodgingGlobeMarkers(warmthDetailRef.current),
            showEateryMarkers: shouldRenderEateryGlobeMarkers(warmthDetailRef.current),
            showBrainSurfaceMarkers: brainSurfaceMarkersRef.current.length > 0,
            showHubAnchors: shouldRenderContextHubGlobeAnchor(warmthDetailRef.current),
          }),
        )
        .htmlLat((element: object) => readGlobeHtmlLat(element as GlobeHtmlMapElement))
        .htmlLng((element: object) => readGlobeHtmlLng(element as GlobeHtmlMapElement))
        .htmlAltitude(0)
        .htmlTransitionDuration(0)
        .htmlElementVisibilityModifier((element, visible) => {
          element.style.opacity = visible ? "1" : "0";
          element.style.pointerEvents = visible ? "auto" : "none";
        })
        .htmlElement((element: object) => {
          const row = element as GlobeHtmlMapElement;
          if (isGlobeContextHubMapAnchor(row)) {
            return createGlobeContextHubAnchorElement(row, {
              onPress: (contextEventId) =>
                onContextHubAnchorPressRef.current?.(contextEventId),
            });
          }
          if (isGlobeLodgingMapMarker(row)) {
            return createGlobeLodgingMarkerElement(row, {
              onPress: (resourceId, carouselIndex) =>
                onLodgingMarkerPressRef.current?.(resourceId, carouselIndex),
            });
          }
          if (isGlobeEateryMapMarker(row)) {
            return createGlobeEateryMarkerElement(row, {
              onPress: (resourceId, carouselIndex) =>
                onEateryMarkerPressRef.current?.(resourceId, carouselIndex),
            });
          }
          if (isBrainSurfaceProjectionCandidate(row)) {
            return createGlobeBrainSurfaceMarkerElement(row, {
              onPress: (candidateId) =>
                onBrainSurfaceMarkerPressRef.current?.(candidateId),
            });
          }
          if (row.pinShape === "viewer") {
            return createGlobe3dViewerPinElement(
              clampGpsAccuracyMeters(viewerLocationRef.current?.accuracyM ?? null),
            );
          }
          const pickMode = contextAgentPickModeRef.current;
          const pickOptions = pickMode ? { gesturePassthrough: true } : undefined;
          if (row.pinShape === "cluster") {
            return createGlobe3dClusterPinElement(
              row,
              {
                onPress: (pinId) => onPinPressRef.current?.(pinId),
                lockControls: () => lockGlobeControlsRef.current(),
                unlockControls: () => unlockGlobeControlsRef.current(),
              },
              pickOptions,
            );
          }
          if (row.pinShape === "dot") {
            return createGlobe3dDotPinElement(
              row,
              row.id === activePinIdRef.current,
              {
                onPress: (pinId) => onPinPressRef.current?.(pinId),
                lockControls: () => lockGlobeControlsRef.current(),
                unlockControls: () => unlockGlobeControlsRef.current(),
              },
              pickOptions,
            );
          }
          if (row.pinShape === "market") {
            return createGlobe3dMarketPinElement(
              row,
              row.id === activePinIdRef.current,
              {
                onPress: (pinId) => onPinPressRef.current?.(pinId),
                lockControls: () => lockGlobeControlsRef.current(),
                unlockControls: () => unlockGlobeControlsRef.current(),
              },
              pickOptions,
            );
          }
          return createGlobe3dPinElement(
            row,
            row.id === activePinIdRef.current,
            {
              onPress: (pinId) => onPinPressRef.current?.(pinId),
              onRelocateStart: (pinId) => beginPinRelocateRef.current(pinId),
              lockControls: () => lockGlobeControlsRef.current(),
              unlockControls: () => unlockGlobeControlsRef.current(),
            },
            {
              relocateEnabled: pinRelocateEnabledRef.current,
              popout: row.id === expandedPinIdRef.current,
              ...pickOptions,
            },
          );
        })
        .arcsData([...tripArcsRef.current])
        .arcStartLat((arc: object) => (arc as GlobeTripArc).startLat)
        .arcStartLng((arc: object) => (arc as GlobeTripArc).startLng)
        .arcEndLat((arc: object) => (arc as GlobeTripArc).endLat)
        .arcEndLng((arc: object) => (arc as GlobeTripArc).endLng)
        .arcColor((arc: object) => (arc as GlobeTripArc).color)
        .arcAltitude((arc: object) => {
          const row = arc as GlobeTripArc;
          if (
            row.id.startsWith("ctxcond-route:") ||
            row.id.startsWith("brain-trace:")
          ) {
            return resolveLocalDiscoveryRouteArcAltitude(row);
          }
          return resolveTripArcAltitude(row);
        })
        .arcStroke((arc: object) =>
          (arc as GlobeTripArc).emphasis === "focused"
            ? GLOBE_TOSS_THEME.tripArcFocusedStroke
            : GLOBE_TOSS_THEME.tripArcStroke,
        )
        .arcsTransitionDuration(0)
        .ringsData([])
        .ringLat((row: object) => (row as { lat: number }).lat)
        .ringLng((row: object) => (row as { lng: number }).lng)
        .ringMaxRadius((row: object) => (row as { maxR: number }).maxR)
        .ringColor((row: object) => {
          const kind = (row as { kind?: string }).kind;
          if (kind === "lens_active") {
            return "rgba(0, 113, 227, 0.18)";
          }
          if (kind === "lens_idle") {
            return "rgba(0, 113, 227, 0.08)";
          }
          if (kind === "discovery") {
            return "rgba(49, 130, 246, 0.14)";
          }
          return GLOBE_TOSS_THEME.viewerRingStroke;
        })
        .ringAltitude(0.001)
        .ringPropagationSpeed(0)
        .ringRepeatPeriod(0)
        .heatmapsData([])
        .heatmapsTransitionDuration(0);

      const renderer = globe.renderer();
      renderer.setPixelRatio(
        Math.min(
          typeof window !== "undefined" ? window.devicePixelRatio : 1,
          resolveGlobePixelRatioCap(),
        ),
      );

      syncGlobeViewport(globe, root);
      requestAnimationFrame(() => syncGlobeViewport(globe, root));

      const resizeObserver = new ResizeObserver(() => {
        syncGlobeViewport(globe, root);
      });
      resizeObserver.observe(root);

      globe.pointOfView({ ...GLOBE_OVERVIEW_POINT_OF_VIEW }, 0);

      const controls = globe.controls();
      tuneGlobeOrbitControls(controls);

      const setGlobeInteracting = (active: boolean) => {
        gestureActiveRef.current = active;
        shellRef.current?.setAttribute(
          "data-globe-interacting",
          active ? "true" : "false",
        );
      };

      const flushDeferredGlobeVisuals = () => {
        if (pendingDetailLevelRef.current) {
          onDetailLevelChangeRef.current?.(pendingDetailLevelRef.current);
          pendingDetailLevelRef.current = null;
        }
        if (pendingPinSyncRef.current) {
          pendingPinSyncRef.current = false;
          syncHtmlElementsRef.current();
        }
        applyGlobePinUiScale(root, pinUiScaleRef.current);
        syncContextWarmthRef.current();
        scheduleTileTextureFiltering();
      };
      flushDeferredGlobeVisualsRef.current = flushDeferredGlobeVisuals;

      controls.addEventListener("start", () => {
        setGlobeInteracting(true);
      });
      controls.addEventListener("end", () => {
        setGlobeInteracting(false);
        flushDeferredGlobeVisuals();
      });

      const warmthSyncTimer: { current: ReturnType<typeof setTimeout> | null } = {
        current: null,
      };
      let lastWarmthSyncAt = 0;

      const scheduleWarmthSync = () => {
        if (gestureActiveRef.current) {
          return;
        }
        if (warmthSyncTimer.current != null) {
          return;
        }
        warmthSyncTimer.current = setTimeout(() => {
          warmthSyncTimer.current = null;
          if (performance.now() - lastWarmthSyncAt < 80) {
            return;
          }
          lastWarmthSyncAt = performance.now();
          syncContextWarmthRef.current();
        }, 48);
      };

      const syncOverviewTexture = (altitude: number) => {
        const overviewUrl = overviewTextureUrlRef.current;
        if (shouldApplyGlobeOverviewTexture(altitude) && overviewUrl) {
          globe.globeImageUrl(overviewUrl);
          return;
        }
        // Stale equirect mosaic blocks slippy tiles on some Android GPUs.
        globe.globeImageUrl(undefined as unknown as string);
      };

      const emitPointOfView = (
        pov: { lat: number; lng: number; altitude: number },
        altitude = pov.altitude,
      ) => {
        const prevAltitude = warmthAltitudeRef.current;
        const prevDetail = warmthDetailRef.current;
        const detailLevel = resolveGlobeDetailLevel(altitude);
        const altitudeChanged = Math.abs(altitude - prevAltitude) > 0.0008;
        const detailChanged = detailLevel !== prevDetail;

        warmthAltitudeRef.current = altitude;
        warmthDetailRef.current = detailLevel;

        if (!altitudeChanged && !detailChanged) {
          return;
        }

        if (detailChanged) {
          shellRef.current?.setAttribute("data-globe-detail", detailLevel);
          globe.showAtmosphere(
            altitude >= GLOBE_TOSS_THEME.atmosphereCutoffAltitude,
          );
          syncOverviewTexture(altitude);
          if (gestureActiveRef.current) {
            pendingDetailLevelRef.current = detailLevel;
          } else {
            onDetailLevelChangeRef.current?.(detailLevel);
            syncHtmlElementsRef.current();
          }
        }

        if (altitudeChanged) {
          const prevUsesOverview = shouldApplyGlobeOverviewTexture(prevAltitude);
          const nextUsesOverview = shouldApplyGlobeOverviewTexture(altitude);
          if (prevUsesOverview !== nextUsesOverview) {
            syncOverviewTexture(altitude);
          }
          const pinScale = resolveGlobePinUiScaleBlended(altitude, detailLevel);
          if (Math.abs(pinScale - pinUiScaleRef.current) > 0.012) {
            pinUiScaleRef.current = pinScale;
            shellRef.current?.style.setProperty(
              "--globe-pin-scale",
              String(pinScale),
            );
            if (!gestureActiveRef.current) {
              applyGlobePinUiScale(root, pinScale);
            }
          }
          scheduleWarmthSync();
        }

        onPointOfViewChangeRef.current?.({ ...pov, altitude, detailLevel });
      };

      const syncTileTextureFiltering = () => {
        applyRimvioGlobeTileTextureFiltering(globe.scene());
      };

      let textureFilterTimer: ReturnType<typeof setTimeout> | null = null;
      let zoomRaf: number | null = null;
      let pendingZoomPov: {
        lat: number;
        lng: number;
        altitude: number;
      } | null = null;

      const scheduleTileTextureFiltering = () => {
        if (textureFilterTimer != null) {
          clearTimeout(textureFilterTimer);
        }
        textureFilterTimer = setTimeout(syncTileTextureFiltering, 280);
      };

      const applyZoomPov = (pov: { lat: number; lng: number; altitude: number }) => {
        let altitude = pov.altitude;
        if (!Number.isFinite(altitude)) {
          return;
        }
        if (altitude < GLOBE_MIN_SAFE_ALTITUDE) {
          altitude = GLOBE_MIN_SAFE_ALTITUDE;
          globe.pointOfView({ altitude }, 0);
          emitPointOfView(pov, altitude);
          return;
        }
        emitPointOfView({ ...pov, altitude }, altitude);
        if (!gestureActiveRef.current) {
          scheduleTileTextureFiltering();
        }
      };
      applyZoomPovRef.current = applyZoomPov;

      const handleZoom = (pov: { lat: number; lng: number; altitude: number }) => {
        pendingZoomPov = pov;
        if (zoomRaf != null) {
          return;
        }
        zoomRaf = requestAnimationFrame(() => {
          zoomRaf = null;
          if (pendingZoomPov) {
            applyZoomPov(pendingZoomPov);
            pendingZoomPov = null;
          }
        });
      };

      emitPointOfView({ ...GLOBE_OVERVIEW_POINT_OF_VIEW });
      globe.onZoom(handleZoom);
      globe.onGlobeClick((coords) => {
        if (
          relocatingPinIdRef.current ||
          pinPressLockRef.current ||
          Date.now() < suppressGlobeClickUntilRef.current
        ) {
          return;
        }
        const handler = onGlobePressRef.current;
        if (
          !handler ||
          !coords ||
          !Number.isFinite(coords.lat) ||
          !Number.isFinite(coords.lng)
        ) {
          return;
        }
        handler({ lat: coords.lat, lng: coords.lng });
      });

      globe.onGlobeReady(() => {
        window.setTimeout(() => {
          syncOverviewTexture(globe.pointOfView().altitude);
          syncTileTextureFiltering();
          tuneGlobeOrbitControls(globe.controls());
        }, 0);
        window.setTimeout(syncTileTextureFiltering, 420);
      });

      globeRef.current = globe;
      setGlobeReady(true);

      return () => {
        if (textureFilterTimer != null) {
          clearTimeout(textureFilterTimer);
        }
        if (warmthSyncTimer.current != null) {
          clearTimeout(warmthSyncTimer.current);
        }
        if (zoomRaf != null) {
          cancelAnimationFrame(zoomRaf);
        }
        flushDeferredGlobeVisualsRef.current = null;
        setGlobeInteracting(false);
        setGlobeReady(false);
        disposeGlobeGpuResources(globe);
        resizeObserver.disconnect();
        globe._destructor();
        globeRef.current = null;
      };
    }, []);

    useGlobeAnimationPower({
      globeRef,
      interactionRootRef: rootRef,
      suspended: renderSuspended,
      enabled: globeReady,
    });

    useGlobeFocalPinch({
      shellRef,
      rootRef,
      globeRef,
      enabled: globeReady && interactionEnabled,
      controlsBlockedRef,
      onAfterFocalZoom: (pov) => applyZoomPovRef.current(pov),
      onInteractingChange: (active) => {
        gestureActiveRef.current = active;
        shellRef.current?.setAttribute(
          "data-globe-interacting",
          active ? "true" : "false",
        );
        if (!active) {
          flushDeferredGlobeVisualsRef.current?.();
        }
      },
    });

    useEffect(() => {
      const globe = globeRef.current;
      if (!globe) {
        return;
      }
      globe.controls().enabled = interactionEnabled;
    }, [interactionEnabled]);

    useEffect(() => {
      if (gestureActiveRef.current) {
        pendingPinSyncRef.current = true;
        return;
      }
      syncHtmlElementsRef.current();
    }, [pins, lodgingMarkers, eateryMarkers, hubAnchors, globeReady, contextAgentPickMode]);

    useEffect(() => {
      shellRef.current?.setAttribute(
        "data-globe-context-agent-pick",
        contextAgentPickMode ? "true" : "false",
      );
      if (!contextAgentPickMode) {
        return;
      }
      pinPressLockRef.current = false;
      controlsBlockedRef.current = Boolean(relocatingPinIdRef.current);
      suppressGlobeClickUntilRef.current = 0;
      const globe = globeRef.current;
      if (globe && !relocatingPinIdRef.current) {
        globe.controls().enabled = true;
      }
    }, [contextAgentPickMode, globeReady]);

    useEffect(() => {
      const globe = globeRef.current;
      if (!globe) {
        return;
      }
      globe.arcsData([...tripArcs]);
    }, [tripArcs]);

    useEffect(() => {
      if (!globeReady) {
        return;
      }
      syncContextWarmthRef.current();
    }, [contextWarmthPoints, contextWarmthEnabled, globeReady]);

    useEffect(() => {
      const globe = globeRef.current;
      if (!globe || !overviewTextureUrl) {
        return;
      }
      const { altitude } = globe.pointOfView();
      if (shouldApplyGlobeOverviewTexture(altitude)) {
        globe.globeImageUrl(overviewTextureUrl);
      } else {
        globe.globeImageUrl(undefined as unknown as string);
      }
    }, [overviewTextureUrl, globeReady]);

    useEffect(() => {
      const globe = globeRef.current;
      if (!globe) {
        return;
      }
      const rings: Array<{
        lat: number;
        lng: number;
        maxR: number;
        kind: "viewer" | "discovery" | "lens_active" | "lens_idle";
      }> = [];

      if (
        viewerLocation &&
        clampGpsAccuracyMeters(viewerLocation.accuracyM) != null
      ) {
        rings.push({
          lat: viewerLocation.lat,
          lng: viewerLocation.lng,
          maxR: accuracyMetersToRingDegrees(
            viewerLocation.lat,
            viewerLocation.accuracyM,
          ),
          kind: "viewer",
        });
      }

      if (discoveryLensSession?.lenses.length) {
        for (const lens of discoveryLensSession.lenses) {
          rings.push({
            lat: lens.center.lat,
            lng: lens.center.lng,
            maxR: discoveryRadiusMetersToRingDegrees(lens.center.lat, lens.radiusM),
            kind:
              lens.id === discoveryLensSession.activeLensId
                ? "lens_active"
                : "lens_idle",
          });
        }
      } else if (contextConditionDiscoveryOverlay?.ring) {
        const ring = contextConditionDiscoveryOverlay.ring;
        rings.push({
          lat: ring.lat,
          lng: ring.lng,
          maxR: discoveryRadiusMetersToRingDegrees(ring.lat, ring.radiusM),
          kind: "discovery",
        });
      }

      globe.ringsData(rings);
    }, [contextConditionDiscoveryOverlay, discoveryLensSession, viewerLocation]);

    useEffect(() => {
      discoveryLensSessionRef.current = discoveryLensSession;
      const globe = globeRef.current;
      if (!globe) {
        return;
      }
      globe.labelsData(
        buildDiscoveryLensLabelRows(
          discoveryLensSession,
          warmthDetailRef.current,
        ),
      );
    }, [discoveryLensSession]);

    useEffect(() => {
      const root = rootRef.current;
      if (!root) {
        return;
      }
      root.querySelectorAll<HTMLElement>("[data-globe-pin-id]").forEach((element) => {
        const pinId = element.dataset.globePinId;
        element.classList.toggle(
          "rimvio-globe-3d-pin--active",
          Boolean(pinId && pinId === activePinId),
        );
      });
    }, [activePinId]);

    const detailHint = relocatingPinId
      ? "원하는 위치로 드래그한 뒤 손을 떼세요"
      : pinRelocateEnabled
        ? (hintText ??
          "핀 길게 눌러 위치 이동 · 드래그 회전 · 스크롤·핀치로 거리·지명 확대")
        : (hintText ?? "드래그 회전 · 스크롤·핀치로 거리·지명 확대");

    return (
      <div
        ref={shellRef}
        className={cn(
          "relative h-full min-h-0 w-full overflow-hidden rimvio-globe-space rimvio-globe-space--toss touch-none",
          className,
        )}
        data-rimvio-globe-3d
        data-globe-canvas-filter={
          shouldDisableGlobeCanvasCssFilter() ? "off" : undefined
        }
      >
        <div ref={rootRef} className="absolute inset-0 touch-none" />
        <div
          className="pointer-events-none absolute inset-0 rimvio-globe-ambient rimvio-globe-ambient--toss"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 rimvio-globe-vignette rimvio-globe-vignette--toss"
          aria-hidden
        />
        {(showInteractionHint || relocatingPinId) ? (
        <p
          className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--rimvio-globe-ingest-offset,5.5rem)+0.35rem)] z-10 mx-auto w-fit rounded-full rimvio-globe-hint--toss px-3.5 py-1.5 text-[11px] font-medium backdrop-blur-md"
          data-rimvio-globe-interaction-hint
        >
          {detailHint}
        </p>
        ) : null}
      </div>
    );
  }),
);
