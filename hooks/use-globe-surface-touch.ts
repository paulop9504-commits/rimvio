"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  commitFlatMapPan,
  panFlatMapViewDelta,
  type FlatMapView,
  zoomFlatMapFromPinch,
  zoomFlatMapView,
} from "@/lib/globe/flat-map-view";
import type { GlobeSurfaceMode } from "@/lib/globe/resolve-globe-surface-mode";

const DRAG_THRESHOLD_PX = 5;

type TouchPoint = { x: number; y: number };

type DragSession = {
  lastX: number;
  lastY: number;
  dragging: boolean;
};

type PinchSession = {
  startDistance: number;
  startZoom: number;
  startView: FlatMapView;
};

export type UseGlobeSurfaceTouchOptions = {
  hubRef: RefObject<HTMLElement | null>;
  surfaceModeRef: RefObject<GlobeSurfaceMode>;
  flatViewRef: RefObject<FlatMapView>;
  onFlatViewChange: (view: FlatMapView) => void;
  onFlatGestureEnd?: (view: FlatMapView) => void;
  /** Two-finger pinch on 3D — switch to flat and continue the same gesture. */
  onPinchEnterFlat: () => FlatMapView | null;
  enabled?: boolean;
};

export function useGlobeSurfaceTouch({
  hubRef,
  surfaceModeRef,
  flatViewRef,
  onFlatViewChange,
  onFlatGestureEnd,
  onPinchEnterFlat,
  enabled = true,
}: UseGlobeSurfaceTouchOptions) {
  const [isInteracting, setIsInteracting] = useState(false);
  const onFlatViewChangeRef = useRef(onFlatViewChange);
  const onFlatGestureEndRef = useRef(onFlatGestureEnd);
  const onPinchEnterFlatRef = useRef(onPinchEnterFlat);
  onFlatViewChangeRef.current = onFlatViewChange;
  onFlatGestureEndRef.current = onFlatGestureEnd;
  onPinchEnterFlatRef.current = onPinchEnterFlat;

  const touchesRef = useRef(new Map<number, TouchPoint>());
  const dragRef = useRef<DragSession | null>(null);
  const pinchRef = useRef<PinchSession | null>(null);
  const flatActiveRef = useRef(false);

  useEffect(() => {
    const hub = hubRef.current;
    if (!hub || !enabled) {
      return;
    }

    const syncTouches = (list: TouchList) => {
      const next = new Map<number, TouchPoint>();
      for (let i = 0; i < list.length; i++) {
        const touch = list[i]!;
        next.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
      }
      touchesRef.current = next;
    };

    const touchDistance = () => {
      const points = Array.from(touchesRef.current.values());
      if (points.length < 2) {
        return 0;
      }
      const [a, b] = points;
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const finishGesture = () => {
      const hadGesture = Boolean(dragRef.current?.dragging || pinchRef.current);
      dragRef.current = null;
      pinchRef.current = null;
      touchesRef.current.clear();
      flatActiveRef.current = false;
      setIsInteracting(false);
      if (!hadGesture) {
        return;
      }
      const committed = commitFlatMapPan(flatViewRef.current);
      flatViewRef.current = committed;
      onFlatViewChangeRef.current(committed);
      onFlatGestureEndRef.current?.(committed);
    };

    const startPinch = (view?: FlatMapView) => {
      dragRef.current = null;
      const distance = touchDistance();
      if (distance <= 0) {
        return;
      }
      const committed = commitFlatMapPan(view ?? flatViewRef.current);
      flatViewRef.current = committed;
      onFlatViewChangeRef.current(committed);
      const startView = committed;
      pinchRef.current = {
        startDistance: distance,
        startZoom: startView.zoom,
        startView,
      };
      flatActiveRef.current = true;
      setIsInteracting(true);
    };

    const onTouchStart = (event: TouchEvent) => {
      syncTouches(event.touches);
      const mode = surfaceModeRef.current;

      if (mode === "vector2d" || flatActiveRef.current) {
        event.preventDefault();
        if (touchesRef.current.size >= 2) {
          startPinch();
          return;
        }
        if (touchesRef.current.size === 1) {
          const point = Array.from(touchesRef.current.values())[0]!;
          pinchRef.current = null;
          dragRef.current = {
            lastX: point.x,
            lastY: point.y,
            dragging: false,
          };
        }
        return;
      }

      if (event.touches.length >= 2) {
        event.preventDefault();
        event.stopPropagation();
        const view = onPinchEnterFlatRef.current();
        if (view) {
          startPinch(view);
        }
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!flatActiveRef.current && surfaceModeRef.current !== "vector2d") {
        return;
      }

      syncTouches(event.touches);

      if (touchesRef.current.size >= 2 && pinchRef.current) {
        event.preventDefault();
        onFlatViewChangeRef.current(
          zoomFlatMapFromPinch(
            pinchRef.current.startView,
            pinchRef.current.startZoom,
            pinchRef.current.startDistance,
            touchDistance(),
          ),
        );
        setIsInteracting(true);
        return;
      }

      const drag = dragRef.current;
      if (!drag || touchesRef.current.size !== 1) {
        return;
      }

      const point = Array.from(touchesRef.current.values())[0]!;
      const deltaX = point.x - drag.lastX;
      const deltaY = point.y - drag.lastY;
      if (!drag.dragging && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) {
        return;
      }

      event.preventDefault();
      drag.dragging = true;
      drag.lastX = point.x;
      drag.lastY = point.y;
      setIsInteracting(true);
      const next = panFlatMapViewDelta(flatViewRef.current, deltaX, deltaY);
      flatViewRef.current = next;
      onFlatViewChangeRef.current(next);
    };

    const onTouchEnd = (event: TouchEvent) => {
      syncTouches(event.touches);
      if (touchesRef.current.size === 0) {
        finishGesture();
        return;
      }
      if (touchesRef.current.size === 1) {
        pinchRef.current = null;
        const point = Array.from(touchesRef.current.values())[0]!;
        dragRef.current = {
          lastX: point.x,
          lastY: point.y,
          dragging: false,
        };
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (surfaceModeRef.current !== "vector2d") {
        return;
      }
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.12 : 0.89;
      onFlatViewChangeRef.current(zoomFlatMapView(flatViewRef.current, factor));
      setIsInteracting(true);
      window.setTimeout(() => setIsInteracting(false), 160);
    };

    hub.addEventListener("touchstart", onTouchStart, { capture: true, passive: false });
    hub.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    hub.addEventListener("touchend", onTouchEnd, { capture: true, passive: false });
    hub.addEventListener("touchcancel", onTouchEnd, { capture: true, passive: false });
    hub.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      hub.removeEventListener("touchstart", onTouchStart, { capture: true });
      hub.removeEventListener("touchmove", onTouchMove, { capture: true });
      hub.removeEventListener("touchend", onTouchEnd, { capture: true });
      hub.removeEventListener("touchcancel", onTouchEnd, { capture: true });
      hub.removeEventListener("wheel", onWheel);
    };
  }, [enabled, flatViewRef, hubRef, surfaceModeRef]);

  return { isInteracting };
}
