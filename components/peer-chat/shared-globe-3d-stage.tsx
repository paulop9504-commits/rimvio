"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { RimvioGlobe3DClient } from "@/components/experience/rimvio-globe-3d-client";
import type { RimvioGlobe3DHandle } from "@/components/experience/rimvio-globe-3d";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import type { GlobeViewerLocation } from "@/lib/globe/globe-viewer-location-types";
import { cn } from "@/lib/utils";

export type SharedGlobe3DStageHandle = RimvioGlobe3DHandle;

export type SharedGlobe3DStageProps = {
  pins: readonly ClassifiedGlobePin[];
  activePinId?: string | null;
  viewerLocation?: GlobeViewerLocation | null;
  onPinPress?: (pinId: string) => void;
  onGlobePress?: (coords: { lat: number; lng: number }) => void;
  className?: string;
};

/** Room 우리 지구 — same Toss 3D globe as `/globe` home. */
export const SharedGlobe3DStage = forwardRef<
  SharedGlobe3DStageHandle,
  SharedGlobe3DStageProps
>(function SharedGlobe3DStage(
  {
    pins,
    activePinId = null,
    viewerLocation = null,
    onPinPress,
    onGlobePress,
    className,
  },
  ref,
) {
  const innerRef = useRef<RimvioGlobe3DHandle>(null);

  useImperativeHandle(ref, () => ({
    flyToPin(lat, lng, level) {
      innerRef.current?.flyToPin(lat, lng, level);
    },
    resetOverview() {
      innerRef.current?.resetOverview();
    },
    getPointOfView() {
      return innerRef.current?.getPointOfView() ?? null;
    },
  }));

  return (
    <div
      className={cn("relative h-[min(42vh,360px)] shrink-0", className)}
      data-shared-globe-3d
    >
      <RimvioGlobe3DClient
        ref={innerRef}
        pins={pins}
        activePinId={activePinId}
        viewerLocation={viewerLocation}
        onPinPress={onPinPress}
        onGlobePress={onGlobePress}
        hintText="드래그 회전 · 핀치 확대"
        className="absolute inset-0"
      />
    </div>
  );
});
