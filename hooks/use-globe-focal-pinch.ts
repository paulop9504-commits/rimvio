"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { GlobeInstance } from "globe.gl";
import { createGestureUpdateCoalescer } from "@/lib/globe/coalesce-gesture-updates";
import {
  altitudeFromPinchDistance,
  applyGlobeFocalZoom,
  resolveGlobeCenterAnchorCoords,
  resolveGlobeScreenCenterClient,
} from "@/lib/globe/globe-focal-pinch-zoom";

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(hover: none)").matches
  );
}

type PinchSession = {
  startDistance: number;
  startAltitude: number;
  anchorLat: number;
  anchorLng: number;
};

export type UseGlobeFocalPinchOptions = {
  rootRef: RefObject<HTMLElement | null>;
  globeRef: RefObject<GlobeInstance | null>;
  enabled?: boolean;
  /** Block re-enabling orbit while pin relocate / press lock is active. */
  controlsBlockedRef?: RefObject<boolean>;
  onInteractingChange?: (active: boolean) => void;
};

/** Mobile two-finger zoom — screen-center focal (Naver/Kakao map grade). */
export function useGlobeFocalPinch({
  rootRef,
  globeRef,
  enabled = true,
  controlsBlockedRef,
  onInteractingChange,
}: UseGlobeFocalPinchOptions) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onInteractingChangeRef = useRef(onInteractingChange);
  onInteractingChangeRef.current = onInteractingChange;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabledRef.current || !isCoarsePointer()) {
      return;
    }

    let session: PinchSession | null = null;
    const zoomCoalescer = createGestureUpdateCoalescer<{
      altitude: number;
    }>((payload) => {
      const globe = globeRef.current;
      if (!globe || !session) {
        return;
      }
      const center = resolveGlobeScreenCenterClient(root);
      applyGlobeFocalZoom({
        globe,
        root,
        anchorLat: session.anchorLat,
        anchorLng: session.anchorLng,
        focalClientX: center.clientX,
        focalClientY: center.clientY,
        nextAltitude: payload.altitude,
      });
    });

    const touchDistance = (touches: TouchList) => {
      if (touches.length < 2) {
        return 0;
      }
      const a = touches[0]!;
      const b = touches[1]!;
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const restoreControls = () => {
      const globe = globeRef.current;
      if (!globe || controlsBlockedRef?.current) {
        return;
      }
      const controls = globe.controls();
      controls.enabled = true;
      controls.enableRotate = true;
    };

    const lockControlsForPinch = () => {
      const globe = globeRef.current;
      if (!globe) {
        return;
      }
      const controls = globe.controls();
      controls.enableRotate = false;
      controls.enableZoom = false;
    };

    const beginPinch = (touches: TouchList) => {
      const globe = globeRef.current;
      if (!globe) {
        return;
      }
      const distance = touchDistance(touches);
      if (distance <= 0) {
        return;
      }
      const anchor = resolveGlobeCenterAnchorCoords(globe, root);
      const pov = globe.pointOfView();
      session = {
        startDistance: distance,
        startAltitude: pov.altitude,
        anchorLat: anchor.lat,
        anchorLng: anchor.lng,
      };
      lockControlsForPinch();
      onInteractingChangeRef.current?.(true);
    };

    const endPinch = () => {
      if (!session) {
        return;
      }
      session = null;
      zoomCoalescer.flushNow();
      restoreControls();
      onInteractingChangeRef.current?.(false);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (!enabledRef.current || event.touches.length < 2) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      beginPinch(event.touches);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!session || event.touches.length < 2) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const distance = touchDistance(event.touches);
      zoomCoalescer.push({
        altitude: altitudeFromPinchDistance(
          session.startAltitude,
          session.startDistance,
          distance,
        ),
      });
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        return;
      }
      endPinch();
    };

    root.addEventListener("touchstart", onTouchStart, {
      capture: true,
      passive: false,
    });
    root.addEventListener("touchmove", onTouchMove, {
      capture: true,
      passive: false,
    });
    root.addEventListener("touchend", onTouchEnd, { capture: true });
    root.addEventListener("touchcancel", onTouchEnd, { capture: true });

    return () => {
      zoomCoalescer.cancel();
      endPinch();
      root.removeEventListener("touchstart", onTouchStart, { capture: true });
      root.removeEventListener("touchmove", onTouchMove, { capture: true });
      root.removeEventListener("touchend", onTouchEnd, { capture: true });
      root.removeEventListener("touchcancel", onTouchEnd, { capture: true });
    };
  }, [controlsBlockedRef, globeRef, rootRef]);
}
