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
import { globeTileEngineUrl } from "@/lib/globe/globe-tile-engine-url";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
import {
  altitudeForGlobeDetailLevel,
  resolveGlobeDetailLevel,
  type GlobeDetailLevel,
} from "@/lib/globe/globe-zoom-levels";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
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
    level?: Extract<GlobeDetailLevel, "city" | "neighborhood" | "pin">,
  ) => void;
  resetOverview: () => void;
};

export type RimvioGlobe3DProps = {
  pins: readonly ClassifiedGlobePin[];
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
      activePinId = null,
      onPinPress,
      onDetailLevelChange,
      className,
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const globeRef = useRef<GlobeInstance | null>(null);
    const onPinPressRef = useRef(onPinPress);
    const onDetailLevelChangeRef = useRef(onDetailLevelChange);
    const activePinIdRef = useRef(activePinId);
    const pinsRef = useRef(pins);

    onPinPressRef.current = onPinPress;
    onDetailLevelChangeRef.current = onDetailLevelChange;
    activePinIdRef.current = activePinId;
    pinsRef.current = pins;

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
        .globeTileEngineMaxLevel(18)
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
        .labelResolution(2)
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
          return createGlobe3dPinElement(
            row,
            row.id === activePinIdRef.current,
            (pinId) => onPinPressRef.current?.(pinId),
          );
        });

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

      const syncLabelsForAltitude = (altitude: number) => {
        const level = resolveGlobeDetailLevel(altitude);
        onDetailLevelChangeRef.current?.(level);
        globe.showAtmosphere(altitude >= GLOBE_TOSS_THEME.atmosphereCutoffAltitude);
        if (level === "region") {
          globe.labelsData([...pinsRef.current]);
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
      if (resolveGlobeDetailLevel(pov.altitude) === "region") {
        globe.labelsData([...pins]);
      }
    }, [pins]);

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

    const detailHint = "드래그 회전 · 스크롤·핀치 확대";

    return (
      <div
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
