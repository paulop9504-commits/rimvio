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
import { useGlobeEarthTexture } from "@/hooks/use-globe-earth-texture";
import { GLOBE_OVERVIEW_POINT_OF_VIEW } from "@/lib/experience-graph/globe-overview-view";
import { createGlobe3dPinElement } from "@/lib/globe/create-globe-3d-pin-element";
import { globeTileEngineUrl } from "@/lib/globe/globe-tile-engine-url";
import {
  altitudeForGlobeDetailLevel,
  GLOBE_ALTITUDE,
  resolveGlobeDetailLevel,
  type GlobeDetailLevel,
} from "@/lib/globe/globe-zoom-levels";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { cn } from "@/lib/utils";

const AUTO_ROTATE_RESUME_MS = 3500;
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
    level?: Extract<GlobeDetailLevel, "city" | "street">,
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
    const { textureUrl, loading } = useGlobeEarthTexture();

    onPinPressRef.current = onPinPress;
    onDetailLevelChangeRef.current = onDetailLevelChange;
    activePinIdRef.current = activePinId;
    pinsRef.current = pins;

    useImperativeHandle(ref, () => ({
      flyToPin(lat, lng, level = "city") {
        const globe = globeRef.current;
        if (!globe) {
          return;
        }
        const controls = globe.controls();
        controls.autoRotate = false;
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
      if (!root || !textureUrl) {
        return;
      }

      const globe = new Globe(root, {
        animateIn: true,
        waitForGlobeReady: true,
        rendererConfig: { antialias: true, alpha: true },
      })
        .backgroundColor("rgba(0,0,0,0)")
        .globeImageUrl(textureUrl)
        .globeTileEngineUrl(globeTileEngineUrl)
        .showGraticules(false)
        .showAtmosphere(true)
        .atmosphereColor("rgb(56, 189, 248)")
        .atmosphereAltitude(0.14)
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
        .htmlAltitude(0.02)
        .htmlTransitionDuration(0)
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
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.45;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 101;
      controls.maxDistance = 520;

      const syncLabelsForAltitude = (altitude: number) => {
        const level = resolveGlobeDetailLevel(altitude);
        onDetailLevelChangeRef.current?.(level);
        if (level === "region") {
          globe.labelsData([...pinsRef.current]);
        } else {
          globe.labelsData([]);
        }
      };

      syncLabelsForAltitude(GLOBE_OVERVIEW_POINT_OF_VIEW.altitude);
      globe.onZoom((pov) => syncLabelsForAltitude(pov.altitude));

      let resumeTimer: ReturnType<typeof setTimeout> | null = null;
      const pauseSpin = () => {
        controls.autoRotate = false;
        if (resumeTimer) {
          clearTimeout(resumeTimer);
          resumeTimer = null;
        }
      };
      const scheduleResume = () => {
        if (resumeTimer) {
          clearTimeout(resumeTimer);
        }
        resumeTimer = setTimeout(() => {
          controls.autoRotate = true;
        }, AUTO_ROTATE_RESUME_MS);
      };

      controls.addEventListener("start", pauseSpin);
      controls.addEventListener("end", scheduleResume);

      globeRef.current = globe;

      return () => {
        resizeObserver.disconnect();
        if (resumeTimer) {
          clearTimeout(resumeTimer);
        }
        controls.removeEventListener("start", pauseSpin);
        controls.removeEventListener("end", scheduleResume);
        globe._destructor();
        globeRef.current = null;
      };
    }, [textureUrl]);

    useEffect(() => {
      const globe = globeRef.current;
      if (!globe) {
        return;
      }
      globe
        .htmlElementsData([...pins])
        .htmlElement((pin: object) => {
          const row = pin as ClassifiedGlobePin;
          return createGlobe3dPinElement(
            row,
            row.id === activePinIdRef.current,
            (pinId) => onPinPressRef.current?.(pinId),
          );
        });

      const pov = globe.pointOfView();
      if (resolveGlobeDetailLevel(pov.altitude) === "region") {
        globe.labelsData([...pins]);
      }
    }, [pins, activePinId]);

    const detailHint = "드래그 회전 · 스크롤 확대 · 핀치 거리뷰";

    return (
      <div
        className={cn(
          "relative h-full min-h-0 w-full overflow-hidden rimvio-globe-space",
          className,
        )}
        data-rimvio-globe-3d
      >
        <div ref={rootRef} className="absolute inset-0 touch-none" />
        <div className="pointer-events-none absolute inset-0 rimvio-globe-stars" aria-hidden />
        {loading ? (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#060a14]/40"
            aria-hidden
          >
            <p className="rounded-full bg-black/40 px-3 py-1 text-[11px] text-white/55 backdrop-blur-sm">
              위성 지구 불러오는 중…
            </p>
          </div>
        ) : null}
        <p className="pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 mx-auto w-fit rounded-full bg-black/35 px-3 py-1 text-[10px] font-medium text-white/45 backdrop-blur-sm">
          {detailHint}
        </p>
      </div>
    );
  }),
);
