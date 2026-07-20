"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getGlobeInfoFramePreset,
  normalizeGlobeInfoFrameLayout,
  readGlobeInfoFrameLayout,
  resolveDefaultGlobeInfoFrameLayout,
  resolveHeightFromAspect,
  touchPairDistance,
  writeGlobeInfoFrameLayout,
  type GlobeInfoFrameId,
  type GlobeInfoFrameLayout,
  type GlobeInfoFrameViewport,
} from "@/lib/globe/brain-surface-floating-frame-layout";

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  dragging: boolean;
};

type ResizeSession = {
  pointerId: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
};

type PinchSession = {
  distance: number;
  width: number;
  height: number;
};

function readViewport(): GlobeInfoFrameViewport {
  if (typeof window === "undefined") {
    return { width: 390, height: 844 };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

function resolveInitialLayout(frameId: GlobeInfoFrameId): GlobeInfoFrameLayout {
  const viewport = readViewport();
  const stored = readGlobeInfoFrameLayout(frameId);
  const fallback = resolveDefaultGlobeInfoFrameLayout(frameId, viewport);
  if (!stored) {
    return fallback;
  }
  return normalizeGlobeInfoFrameLayout(frameId, stored, viewport);
}

export function useBrainSurfaceFloatingFrame(frameId: GlobeInfoFrameId) {
  const preset = getGlobeInfoFramePreset(frameId);
  const [layout, setLayoutState] = useState<GlobeInfoFrameLayout>(() =>
    resolveInitialLayout(frameId),
  );
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef(layout);
  const dragRef = useRef<DragSession | null>(null);
  const resizeRef = useRef<ResizeSession | null>(null);
  const pinchRef = useRef<PinchSession | null>(null);
  const pinchActiveRef = useRef(false);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  const persistLayout = useCallback(
    (next: GlobeInfoFrameLayout) => {
      const normalized = normalizeGlobeInfoFrameLayout(frameId, next, readViewport());
      layoutRef.current = normalized;
      setLayoutState(normalized);
      writeGlobeInfoFrameLayout(frameId, normalized);
    },
    [frameId],
  );

  const clampLayoutToViewport = useCallback(() => {
    persistLayout(layoutRef.current);
  }, [persistLayout]);

  useEffect(() => {
    const onResize = () => {
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        (active.closest("[data-globe-context-condition-compose-input]") ||
          active.closest("[data-globe-context-condition-pin-bar]"))
      ) {
        // Soft keyboard resize must not rewrite layout mid-IME.
        return;
      }
      persistLayout(layoutRef.current);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [persistLayout]);

  const applySize = useCallback(
    (widthPx: number, heightPx: number) => {
      const viewport = readViewport();
      let width = widthPx;
      let height = heightPx;
      if (preset.aspectRatio) {
        height = resolveHeightFromAspect(width, preset.aspectRatio, preset, viewport.height);
      }
      persistLayout({
        ...layoutRef.current,
        width,
        height,
      });
    },
    [persistLayout, preset],
  );

  const onDragHandlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      event.stopPropagation();
      event.preventDefault();
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: layoutRef.current.left,
        startTop: layoutRef.current.top,
        dragging: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const onDragHandlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const session = dragRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }
      event.stopPropagation();
      const dx = event.clientX - session.startX;
      const dy = event.clientY - session.startY;
      if (!session.dragging && Math.hypot(dx, dy) < 4) {
        return;
      }
      session.dragging = true;
      setDragging(true);
      persistLayout({
        ...layoutRef.current,
        left: session.startLeft + dx,
        top: session.startTop + dy,
      });
    },
    [persistLayout],
  );

  const finishDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const session = dragRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }
      event.stopPropagation();
      dragRef.current = null;
      setDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      clampLayoutToViewport();
    },
    [clampLayoutToViewport],
  );

  const onResizeHandlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();
      setResizing(true);
      resizeRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: layoutRef.current.width,
        startHeight: layoutRef.current.height,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const onResizeHandlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const session = resizeRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }
      event.stopPropagation();
      const dx = event.clientX - session.startX;
      const dy = event.clientY - session.startY;
      applySize(session.startWidth + dx * 1.05, session.startHeight + dy * 1.05);
    },
    [applySize],
  );

  const onResizeHandlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      resizeRef.current = null;
      setResizing(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      clampLayoutToViewport();
    },
    [clampLayoutToViewport],
  );

  const onShellTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      pinchActiveRef.current = true;
      pinchRef.current = {
        distance: touchPairDistance(event.touches[0]!, event.touches[1]!),
        width: layoutRef.current.width,
        height: layoutRef.current.height,
      };
    }
  }, []);

  const onShellTouchMove = useCallback(
    (event: React.TouchEvent) => {
      const session = pinchRef.current;
      if (!session || event.touches.length !== 2) {
        return;
      }
      event.preventDefault();
      const distance = touchPairDistance(event.touches[0]!, event.touches[1]!);
      const ratio = distance / session.distance;
      applySize(session.width * ratio, session.height * ratio);
    },
    [applySize],
  );

  const onShellTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (event.touches.length < 2) {
        pinchRef.current = null;
        pinchActiveRef.current = false;
        clampLayoutToViewport();
      }
    },
    [clampLayoutToViewport],
  );

  const resetLayout = useCallback(() => {
    persistLayout(resolveDefaultGlobeInfoFrameLayout(frameId, readViewport()));
  }, [frameId, persistLayout]);

  return {
    layout,
    frameRef,
    dragging,
    resizing,
    pinchActiveRef,
    resetLayout,
    onDragHandlePointerDown,
    onDragHandlePointerMove,
    onDragHandlePointerUp: finishDrag,
    onDragHandlePointerCancel: finishDrag,
    onResizeHandlePointerDown,
    onResizeHandlePointerMove,
    onResizeHandlePointerUp,
    onShellTouchStart,
    onShellTouchMove,
    onShellTouchEnd,
  };
}
