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
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
import type { GlobeViewerLocation } from "@/lib/globe/globe-viewer-location-types";
import { resolveGlobePinLabelStyle } from "@/lib/globe/resolve-globe-pin-label-style";
import {
  altitudeForGlobeDetailLevel,
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
    level?: Extract<GlobeDetailLevel, "city" | "neighborhood" | "street" | "pin">,
  ) => void;
  resetOverview: () => void;
};

export type RimvioGlobe3DProps = {
  pins: readonly ClassifiedGlobePin[];
  tripArcs?: readonly GlobeTripArc[];
  viewerLocation?: GlobeViewerLocation | null;
  activePinId?: string | null;
  onPinPress?: (pinId: string) => void;
  onDetailLevelChange?: (level: GlobeDetailLevel) => void;
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
      onDetailLevelChange,
      className,
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const shellRef = useRef<HTMLDivElement>(null);
    const globeRef = useRef<GlobeInstance | null>(null);
    const onPinPressRef = useRef(onPinPress);
    const onDetailLevelChangeRef = useRef(onDetailLevelChange);
    const activePinIdRef = useRef(activePinId);
    const pinsRef = useRef(pins);
    const tripArcsRef = useRef(tripArcs);
    const viewerLocationRef = useRef(viewerLocation);

    onPinPressRef.current = onPinPress;
    onDetailLevelChangeRef.current = onDetailLevelChange;
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
    }));

    useEffect(() => {
      const root = rootRef.current;
      if (!root) {
        return;
      }

      const globe = new Globe(root, {
        animateIn: true,
        waitForGlobeReady: true,
        rendererConfig: { antialias: true, alpha: true },
      })
        .backgroundColor("rgba(0,0,0,0)")
        .globeTileEngineUrl(globeTileEngineUrl)
        .globeTileEngineMaxLevel(GLOBE_TILE_MAX_ZOOM)
        .showGraticules(false)
        .showAtmosphere(true)
        .atmosphereColor(GLOBE_TOSS_THEME.atmosphere)
        .atmosphereAltitude(GLOBE_TOSS_THEME.atmosphereAltitude)
        .labelsData([])
        .labelLat((row: object) => (row as ClassifiedGlobePin).lat)
        .labelLng((row: object) => (row as ClassifiedGlobePin).lng)
        .labelText((row: object) => {
          const pin = row as ClassifiedGlobePin;
          return pin.slot?.experienceTitle?.trim() || pin.label.trim();
        })
        .labelSize(0.55)
        .labelDotRadius(0.14)
        .labelAltitude(0.01)
        .labelColor(() => GLOBE_TOSS_THEME.labelInk)
        .labelResolution(2)
        .labelIncludeDot(true)
        .labelsTransitionDuration(0)
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
              viewerLocationRef.current?.accuracyM ?? null,
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
      renderer.setPixelRatio(Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2.5));

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
      controls.dampingFactor = 0.08;

      const experiencePins = () =>
        pinsRef.current.filter((row) => row.pinShape !== "viewer");

      const syncLabelsForAltitude = (altitude: number) => {
        const level = resolveGlobeDetailLevel(altitude);
        onDetailLevelChangeRef.current?.(level);
        shellRef.current?.setAttribute("data-globe-detail", level);
        globe.showAtmosphere(altitude >= GLOBE_TOSS_THEME.atmosphereCutoffAltitude);

        const labelStyle = resolveGlobePinLabelStyle(level);
        globe
          .labelSize(labelStyle.size)
          .labelDotRadius(labelStyle.dotRadius)
          .labelAltitude(labelStyle.altitude)
          .labelResolution(labelStyle.resolution);

        if (labelStyle.show) {
          globe.labelsData([...experiencePins()]);
        } else {
          globe.labelsData([]);
        }
      };

      syncLabelsForAltitude(GLOBE_OVERVIEW_POINT_OF_VIEW.altitude);
      globe.onZoom((pov) => syncLabelsForAltitude(pov.altitude));

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

      const pov = globe.pointOfView();
      const labelStyle = resolveGlobePinLabelStyle(resolveGlobeDetailLevel(pov.altitude));
      if (labelStyle.show) {
        globe.labelsData([...pins.filter((row) => row.pinShape !== "viewer")]);
      }
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
      if (!globe) {
        return;
      }
      if (!viewerLocation) {
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

    const detailHint = "드래그 회전 · 스크롤·핀치로 거리·지명 확대";

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
