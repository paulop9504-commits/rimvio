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
import { GLOBE_OVERVIEW_POINT_OF_VIEW } from "@/lib/experience-graph/globe-overview-view";
import { createGlobe3dPinElement, createGlobe3dClusterPinElement } from "@/lib/globe/create-globe-3d-pin-element";
import { createGlobe3dViewerPinElement } from "@/lib/globe/create-globe-3d-viewer-pin-element";
import { accuracyMetersToRingDegrees } from "@/lib/globe/accuracy-ring-degrees";
import { GLOBE_TILE_MAX_ZOOM } from "@/lib/globe/globe-tile-constants";
import { globeTileEngineUrl } from "@/lib/globe/globe-tile-engine-url";
import { applyRimvioGlobeTileTextureFiltering } from "@/lib/globe/apply-rimvio-globe-tile-texture-filtering";
import { disposeGlobeGpuResources } from "@/lib/globe/dispose-globe-gpu-resources";
import { useGlobeAnimationPower } from "@/hooks/use-globe-animation-power";
import { useGlobeOverviewTexture } from "@/hooks/use-globe-equirect-texture";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
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
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import type { GlobeTripArc } from "@/lib/globe/project-trip-leg-arcs";
import type { GlobeContextWarmthPoint } from "@/lib/globe/globe-context-warmth-types";
import { syncGlobeContextWarmthLayer } from "@/lib/globe/sync-globe-context-warmth-layer";
import { screenPointToGlobeCoords } from "@/lib/globe/screen-point-to-globe-coords";
import { cn } from "@/lib/utils";

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

export type RimvioGlobe3DHandle = {
  flyToPin: (
    lat: number,
    lng: number,
    level?: Extract<
      GlobeDetailLevel,
      "region" | "city" | "neighborhood" | "street" | "pin"
    >,
  ) => void;
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
  /** Soft trace-density wash — overview/region only. */
  contextWarmthPoints?: readonly GlobeContextWarmthPoint[];
  contextWarmthEnabled?: boolean;
  viewerLocation?: GlobeViewerLocation | null;
  activePinId?: string | null;
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
  className?: string;
};

/** WebGL Earth — Google Earth orbit, tile zoom, fly-to-place. */
export const RimvioGlobe3D = memo(
  forwardRef<RimvioGlobe3DHandle, RimvioGlobe3DProps>(function RimvioGlobe3D(
    {
      pins,
      tripArcs = [],
      contextWarmthPoints = [],
      contextWarmthEnabled = true,
      viewerLocation = null,
      activePinId = null,
      onPinPress,
      pinRelocateEnabled = false,
      onPinRelocate,
      onGlobePress,
      hintText,
      onDetailLevelChange,
      onPointOfViewChange,
      interactionEnabled = true,
      renderSuspended = false,
      className,
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const shellRef = useRef<HTMLDivElement>(null);
    const globeRef = useRef<GlobeInstance | null>(null);
    const onPinPressRef = useRef(onPinPress);
    const onPinRelocateRef = useRef(onPinRelocate);
    const pinRelocateEnabledRef = useRef(pinRelocateEnabled);
    const onGlobePressRef = useRef(onGlobePress);
    const onDetailLevelChangeRef = useRef(onDetailLevelChange);
    const onPointOfViewChangeRef = useRef(onPointOfViewChange);
    const activePinIdRef = useRef(activePinId);
    const pinsRef = useRef(pins);
    const tripArcsRef = useRef(tripArcs);
    const contextWarmthPointsRef = useRef(contextWarmthPoints);
    const contextWarmthEnabledRef = useRef(contextWarmthEnabled);
    const warmthAltitudeRef = useRef(GLOBE_OVERVIEW_POINT_OF_VIEW.altitude);
    const warmthDetailRef = useRef<GlobeDetailLevel>("space");
    const viewerLocationRef = useRef(viewerLocation);
    const overviewTextureUrlRef = useRef<string | null>(null);
    const [globeReady, setGlobeReady] = useState(false);
    const { textureUrl: overviewTextureUrl } = useGlobeOverviewTexture();
    overviewTextureUrlRef.current = overviewTextureUrl;

    const [relocatingPinId, setRelocatingPinId] = useState<string | null>(null);
    const relocatingPinIdRef = useRef<string | null>(null);
    const pinPressLockRef = useRef(false);
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

    lockGlobeControlsRef.current = () => {
      pinPressLockRef.current = true;
      suppressGlobeClickUntilRef.current = Date.now() + 900;
      const globe = globeRef.current;
      if (globe) {
        globe.controls().enabled = false;
      }
    };

    unlockGlobeControlsRef.current = () => {
      pinPressLockRef.current = false;
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

      const finishRelocate = (event: PointerEvent) => {
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
        relocatePreviewRef.current = {
          pinId: relocatingPinId,
          lat: coords.lat,
          lng: coords.lng,
        };
        const rows = (globe.htmlElementsData() as ClassifiedGlobePin[]).map(
          (pin) =>
            pin.id === relocatingPinId
              ? { ...pin, lat: coords.lat, lng: coords.lng }
              : pin,
        );
        globe.htmlElementsData(rows);
      };

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", finishRelocate, { passive: false });
      window.addEventListener("pointercancel", finishRelocate, { passive: false });
      return () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", finishRelocate);
        window.removeEventListener("pointercancel", finishRelocate);
        globe.controls().enabled = true;
      };
    }, [relocatingPinId]);

    onPinPressRef.current = onPinPress;
    onPinRelocateRef.current = onPinRelocate;
    pinRelocateEnabledRef.current = pinRelocateEnabled;
    onGlobePressRef.current = onGlobePress;
    onDetailLevelChangeRef.current = onDetailLevelChange;
    onPointOfViewChangeRef.current = onPointOfViewChange;
    activePinIdRef.current = activePinId;
    pinsRef.current = pins;
    tripArcsRef.current = tripArcs;
    contextWarmthPointsRef.current = contextWarmthPoints;
    contextWarmthEnabledRef.current = contextWarmthEnabled;

    const syncContextWarmthRef = useRef(() => {});
    syncContextWarmthRef.current = () => {
      const globe = globeRef.current;
      if (!globe) {
        return;
      }
      syncGlobeContextWarmthLayer({
        globe,
        enabled: contextWarmthEnabledRef.current,
        points: contextWarmthPointsRef.current,
        altitude: warmthAltitudeRef.current,
        detailLevel: warmthDetailRef.current,
      });
    };
    viewerLocationRef.current = viewerLocation;

    useImperativeHandle(ref, () => ({
      flyToPin(lat, lng, level = "neighborhood") {
        const globe = globeRef.current;
        if (!globe) {
          return;
        }
        const controls = globe.controls();
        globe.pointOfView(
          { lat, lng, altitude: altitudeForGlobeDetailLevel(level) },
          FLY_MS,
        );
      },
      resetOverview() {
        const globe = globeRef.current;
        if (!globe) {
          return;
        }
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
        rendererConfig: { antialias: true, alpha: true, precision: "highp" },
      })
        .backgroundColor("rgba(0,0,0,0)")
        .globeTileEngineUrl(globeTileEngineUrl)
        .globeTileEngineMaxLevel(GLOBE_TILE_MAX_ZOOM)
        .showGraticules(false)
        .showAtmosphere(true)
        .atmosphereColor(GLOBE_TOSS_THEME.atmosphere)
        .atmosphereAltitude(GLOBE_TOSS_THEME.atmosphereAltitude)
        .labelsData([])
        .htmlElementsData([...pinsRef.current])
        .htmlLat((pin: object) => (pin as ClassifiedGlobePin).lat)
        .htmlLng((pin: object) => (pin as ClassifiedGlobePin).lng)
        .htmlAltitude(0)
        .htmlTransitionDuration(0)
        .htmlElementVisibilityModifier((element, visible) => {
          element.style.opacity = visible ? "1" : "0";
          element.style.pointerEvents = visible ? "auto" : "none";
        })
        .htmlElement((pin: object) => {
          const row = pin as ClassifiedGlobePin;
          if (row.pinShape === "viewer") {
            return createGlobe3dViewerPinElement(
              clampGpsAccuracyMeters(viewerLocationRef.current?.accuracyM ?? null),
            );
          }
          if (row.pinShape === "cluster") {
            return createGlobe3dClusterPinElement(row, {
              onPress: (pinId) => onPinPressRef.current?.(pinId),
              lockControls: () => lockGlobeControlsRef.current(),
              unlockControls: () => unlockGlobeControlsRef.current(),
            });
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
            { relocateEnabled: pinRelocateEnabledRef.current },
          );
        })
        .arcsData([...tripArcsRef.current])
        .arcStartLat((arc: object) => (arc as GlobeTripArc).startLat)
        .arcStartLng((arc: object) => (arc as GlobeTripArc).startLng)
        .arcEndLat((arc: object) => (arc as GlobeTripArc).endLat)
        .arcEndLng((arc: object) => (arc as GlobeTripArc).endLng)
        .arcColor((arc: object) => (arc as GlobeTripArc).color)
        .arcAltitude(0.22)
        .arcStroke(GLOBE_TOSS_THEME.tripArcStroke)
        .arcsTransitionDuration(0)
        .ringsData([])
        .ringLat((row: object) => (row as { lat: number }).lat)
        .ringLng((row: object) => (row as { lng: number }).lng)
        .ringMaxRadius((row: object) => (row as { maxR: number }).maxR)
        .ringColor(() => GLOBE_TOSS_THEME.viewerRingStroke)
        .ringAltitude(0.001)
        .ringPropagationSpeed(0)
        .ringRepeatPeriod(0)
        .heatmapsData([])
        .heatmapsTransitionDuration(0);

      const renderer = globe.renderer();
      renderer.setPixelRatio(
        Math.min(
          typeof window !== "undefined" ? window.devicePixelRatio : 1,
          GLOBE_TOSS_THEME.globePixelRatioCap,
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
      controls.enablePan = false;
      controls.autoRotate = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      const syncOverviewTexture = (altitude: number) => {
        const overviewUrl = overviewTextureUrlRef.current;
        if (altitude >= 0.42 && overviewUrl) {
          globe.globeImageUrl(overviewUrl);
        }
      };

      const emitPointOfView = (
        pov: { lat: number; lng: number; altitude: number },
        altitude = pov.altitude,
      ) => {
        const detailLevel = resolveGlobeDetailLevel(altitude);
        warmthAltitudeRef.current = altitude;
        warmthDetailRef.current = detailLevel;
        onDetailLevelChangeRef.current?.(detailLevel);
        shellRef.current?.setAttribute("data-globe-detail", detailLevel);
        const pinScale = resolveGlobePinUiScaleBlended(altitude, detailLevel);
        pinUiScaleRef.current = pinScale;
        shellRef.current?.style.setProperty("--globe-pin-scale", String(pinScale));
        applyGlobePinUiScale(root, pinScale);
        globe.showAtmosphere(altitude >= GLOBE_TOSS_THEME.atmosphereCutoffAltitude);
        globe.labelsData([]);
        syncOverviewTexture(altitude);
        syncContextWarmthRef.current();
        onPointOfViewChangeRef.current?.({ ...pov, altitude, detailLevel });
      };

      const syncTileTextureFiltering = () => {
        applyRimvioGlobeTileTextureFiltering(globe.scene());
      };

      let textureFilterTimer: ReturnType<typeof setTimeout> | null = null;
      const scheduleTileTextureFiltering = () => {
        if (textureFilterTimer != null) {
          clearTimeout(textureFilterTimer);
        }
        textureFilterTimer = setTimeout(syncTileTextureFiltering, 280);
      };

      const handleZoom = (pov: { lat: number; lng: number; altitude: number }) => {
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
        scheduleTileTextureFiltering();
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
          const controls = globe.controls();
          controls.zoomSpeed = 1.9;
          controls.rotateSpeed = 0.45;
        }, 0);
        window.setTimeout(syncTileTextureFiltering, 420);
      });

      globeRef.current = globe;
      setGlobeReady(true);

      return () => {
        if (textureFilterTimer != null) {
          clearTimeout(textureFilterTimer);
        }
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

    useEffect(() => {
      const globe = globeRef.current;
      if (!globe) {
        return;
      }
      globe.controls().enabled = interactionEnabled;
    }, [interactionEnabled]);

    useEffect(() => {
      const globe = globeRef.current;
      const root = rootRef.current;
      if (!globe || !root) {
        return;
      }
      globe.htmlElementsData([...pins]);
      globe.labelsData([]);
      applyGlobePinUiScale(root, pinUiScaleRef.current);
    }, [pins]);

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
      if (altitude >= 0.42) {
        globe.globeImageUrl(overviewTextureUrl);
      }
    }, [overviewTextureUrl]);

    useEffect(() => {
      const globe = globeRef.current;
      if (!globe) {
        return;
      }
      if (!viewerLocation || clampGpsAccuracyMeters(viewerLocation.accuracyM) == null) {
        globe.ringsData([]);
        return;
      }
      globe.ringsData([
        {
          lat: viewerLocation.lat,
          lng: viewerLocation.lng,
          maxR: accuracyMetersToRingDegrees(
            viewerLocation.lat,
            viewerLocation.accuracyM,
          ),
        },
      ]);
    }, [viewerLocation]);

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
          "relative h-full min-h-0 w-full overflow-hidden rimvio-globe-space rimvio-globe-space--toss",
          className,
        )}
        data-rimvio-globe-3d
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
        <p className="pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 mx-auto w-fit rounded-full rimvio-globe-hint--toss px-3.5 py-1.5 text-[11px] font-medium backdrop-blur-md">
          {detailHint}
        </p>
      </div>
    );
  }),
);
