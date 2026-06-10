"use client";

import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import Globe from "globe.gl";
import type { GlobeInstance } from "globe.gl";
import { GLOBE_OVERVIEW_POINT_OF_VIEW } from "@/lib/experience-graph/globe-overview-view";
import { createGlobe3dPinElement } from "@/lib/globe/create-globe-3d-pin-element";
import { createGlobe3dViewerPinElement } from "@/lib/globe/create-globe-3d-viewer-pin-element";
import { accuracyMetersToRingDegrees } from "@/lib/globe/accuracy-ring-degrees";
import { GLOBE_TILE_MAX_ZOOM } from "@/lib/globe/globe-tile-constants";
import { globeTileEngineUrl } from "@/lib/globe/globe-tile-engine-url";
import { useGlobeOverviewTexture } from "@/hooks/use-globe-equirect-texture";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
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
};

export type RimvioGlobe3DProps = {
  pins: readonly ClassifiedGlobePin[];
  tripArcs?: readonly GlobeTripArc[];
  viewerLocation?: GlobeViewerLocation | null;
  activePinId?: string | null;
  onPinPress?: (pinId: string) => void;
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
  className?: string;
};

/** WebGL Earth — Google Earth orbit, tile zoom, fly-to-place. */
export const RimvioGlobe3D = memo(
  forwardRef<RimvioGlobe3DHandle, RimvioGlobe3DProps>(function RimvioGlobe3D(
    {
      pins,
      tripArcs = [],
      viewerLocation = null,
      activePinId = null,
      onPinPress,
      onGlobePress,
      hintText,
      onDetailLevelChange,
      onPointOfViewChange,
      className,
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const shellRef = useRef<HTMLDivElement>(null);
    const globeRef = useRef<GlobeInstance | null>(null);
    const onPinPressRef = useRef(onPinPress);
    const onGlobePressRef = useRef(onGlobePress);
    const onDetailLevelChangeRef = useRef(onDetailLevelChange);
    const onPointOfViewChangeRef = useRef(onPointOfViewChange);
    const activePinIdRef = useRef(activePinId);
    const pinsRef = useRef(pins);
    const tripArcsRef = useRef(tripArcs);
    const viewerLocationRef = useRef(viewerLocation);
    const overviewTextureUrlRef = useRef<string | null>(null);
    const { textureUrl: overviewTextureUrl } = useGlobeOverviewTexture();
    overviewTextureUrlRef.current = overviewTextureUrl;

    onPinPressRef.current = onPinPress;
    onGlobePressRef.current = onGlobePress;
    onDetailLevelChangeRef.current = onDetailLevelChange;
    onPointOfViewChangeRef.current = onPointOfViewChange;
    activePinIdRef.current = activePinId;
    pinsRef.current = pins;
    tripArcsRef.current = tripArcs;
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
          return createGlobe3dPinElement(
            row,
            row.id === activePinIdRef.current,
            (pinId) => onPinPressRef.current?.(pinId),
          );
        })
        .arcsData([...tripArcsRef.current])
        .arcStartLat((arc: object) => (arc as GlobeTripArc).startLat)
        .arcStartLng((arc: object) => (arc as GlobeTripArc).startLng)
        .arcEndLat((arc: object) => (arc as GlobeTripArc).endLat)
        .arcEndLng((arc: object) => (arc as GlobeTripArc).endLng)
        .arcColor((arc: object) => (arc as GlobeTripArc).color)
        .arcAltitude(0.22)
        .arcStroke(0.85)
        .arcsTransitionDuration(0)
        .ringsData([])
        .ringLat((row: object) => (row as { lat: number }).lat)
        .ringLng((row: object) => (row as { lng: number }).lng)
        .ringMaxRadius((row: object) => (row as { maxR: number }).maxR)
        .ringColor(() => GLOBE_TOSS_THEME.viewerRingStroke)
        .ringAltitude(0.001)
        .ringPropagationSpeed(0)
        .ringRepeatPeriod(0);

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
        onDetailLevelChangeRef.current?.(detailLevel);
        shellRef.current?.setAttribute("data-globe-detail", detailLevel);
        globe.showAtmosphere(altitude >= GLOBE_TOSS_THEME.atmosphereCutoffAltitude);
        globe.labelsData([]);
        syncOverviewTexture(altitude);
        onPointOfViewChangeRef.current?.({ ...pov, altitude, detailLevel });
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
      };

      emitPointOfView({ ...GLOBE_OVERVIEW_POINT_OF_VIEW });
      globe.onZoom(handleZoom);
      globe.onGlobeClick((coords) => {
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
          const controls = globe.controls();
          controls.zoomSpeed = 1.5;
          controls.rotateSpeed = 0.45;
        }, 0);
      });

      globeRef.current = globe;

      return () => {
        resizeObserver.disconnect();
        globe._destructor();
        globeRef.current = null;
      };
    }, []);

    useEffect(() => {
      const globe = globeRef.current;
      if (!globe) {
        return;
      }
      globe.htmlElementsData([...pins]);
      globe.labelsData([]);
    }, [pins]);

    useEffect(() => {
      const globe = globeRef.current;
      if (!globe) {
        return;
      }
      globe.arcsData([...tripArcs]);
    }, [tripArcs]);

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

    const detailHint =
      hintText ?? "드래그 회전 · 스크롤·핀치로 거리·지명 확대";

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
