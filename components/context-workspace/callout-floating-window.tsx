"use client";

/**
 * CalloutFloatingWindow — Figma/Cursor-style floating Control Surface.
 * Drag header · corner resize · pinch scale · compact/floating/workspace.
 * Outer layer pointer-events-none; card pointer-events-auto (map stays interactive).
 */

import { useCallback, useRef, useState } from "react";
import { Callout } from "@/lib/callout/Callout";
import {
  CalloutSessionProvider,
  type CalloutSessionValue,
} from "@/lib/callout/callout-session";
import {
  focusCalloutWindow,
  setCalloutWindowMode,
  updateCalloutWindowLayout,
  type CalloutWindow,
  type CalloutWindowMode,
} from "@/lib/callout/windows";
import { cn } from "@/lib/utils";

function touchPairDistance(
  a: { readonly clientX: number; readonly clientY: number },
  b: { readonly clientX: number; readonly clientY: number },
): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export type CalloutFloatingWindowProps = {
  readonly window: CalloutWindow;
  readonly session: CalloutSessionValue;
  readonly title: string;
  readonly subtitleKo?: string | null;
  /** Pin screen projection — used while anchored */
  readonly anchor: { readonly x: number; readonly y: number } | null;
  readonly onClose?: (windowId: string) => void;
  readonly onRequestWorkspace?: (entityId: string) => void;
  readonly className?: string;
};

export function CalloutFloatingWindow({
  window: win,
  session,
  title,
  subtitleKo = null,
  anchor,
  onClose,
  onRequestWorkspace,
  className,
}: CalloutFloatingWindowProps) {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const resizeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

  const left =
    win.anchored && anchor
      ? anchor.x - win.size.width / 2
      : win.position.x;
  const top =
    win.anchored && anchor
      ? anchor.y - win.size.height - 12
      : win.position.y;

  const onFocus = useCallback(() => {
    focusCalloutWindow(win.id);
  }, [win.id]);

  const onDragDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      // Chrome buttons (close / mode) — don't capture; otherwise click never fires.
      if ((event.target as HTMLElement | null)?.closest?.("button")) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      onFocus();
      const originX =
        win.anchored && anchor ? anchor.x - win.size.width / 2 : win.position.x;
      const originY =
        win.anchored && anchor
          ? anchor.y - win.size.height - 12
          : win.position.y;
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX,
        originY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [win, anchor, onFocus],
  );

  const onDragMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const s = dragRef.current;
      if (!s || s.pointerId !== event.pointerId) return;
      event.stopPropagation();
      const dx = event.clientX - s.startX;
      const dy = event.clientY - s.startY;
      if (Math.hypot(dx, dy) < 3 && !dragging) return;
      setDragging(true);
      updateCalloutWindowLayout(win.id, {
        position: { x: s.originX + dx, y: s.originY + dy },
        anchored: false,
      });
    },
    [win.id, dragging],
  );

  const onDragUp = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const s = dragRef.current;
    if (!s || s.pointerId !== event.pointerId) return;
    event.stopPropagation();
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onResizeDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();
      onFocus();
      resizeRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startW: win.size.width,
        startH: win.size.height,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [win.size, onFocus],
  );

  const onResizeMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const s = resizeRef.current;
      if (!s || s.pointerId !== event.pointerId) return;
      event.stopPropagation();
      const width = Math.max(200, Math.min(480, s.startW + (event.clientX - s.startX)));
      const height = Math.max(120, Math.min(720, s.startH + (event.clientY - s.startY)));
      updateCalloutWindowLayout(win.id, {
        size: { width, height },
        anchored: false,
      });
    },
    [win.id],
  );

  const onResizeUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const s = resizeRef.current;
    if (!s || s.pointerId !== event.pointerId) return;
    event.stopPropagation();
    resizeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length !== 2) return;
      const a = event.touches[0]!;
      const b = event.touches[1]!;
      pinchRef.current = {
        distance: touchPairDistance(a, b),
        scale: win.scale,
      };
    },
    [win.scale],
  );

  const onTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const pinch = pinchRef.current;
      if (!pinch || event.touches.length !== 2) return;
      event.stopPropagation();
      const dist = touchPairDistance(event.touches[0]!, event.touches[1]!);
      if (pinch.distance < 1) return;
      const next = pinch.scale * (dist / pinch.distance);
      updateCalloutWindowLayout(win.id, { scale: next });
    },
    [win.id],
  );

  const onTouchEnd = useCallback(() => {
    pinchRef.current = null;
  }, []);

  const setMode = useCallback(
    (mode: CalloutWindowMode) => {
      setCalloutWindowMode(win.id, mode);
      if (mode === "workspace") {
        onRequestWorkspace?.(win.entityId);
      }
    },
    [win.id, win.entityId, onRequestWorkspace],
  );

  const isCompact = win.mode === "compact";

  return (
    <div
      className={cn("pointer-events-none absolute", className)}
      style={{
        left,
        top,
        width: win.size.width,
        height: isCompact ? win.size.height : undefined,
        maxHeight: isCompact ? win.size.height : win.size.height,
        zIndex: win.zIndex,
        transform: `scale(${win.scale})`,
        transformOrigin: "top left",
      }}
      data-callout-floating-window={win.id}
      data-callout-mode={win.mode}
      data-callout-anchored={win.anchored ? "true" : "false"}
    >
      <div
        className={cn(
          "pointer-events-auto relative flex flex-col overflow-hidden rounded-[18px] bg-white/96 shadow-[0_12px_40px_rgba(25,31,40,0.18)] ring-1 ring-black/[0.06] backdrop-blur-md",
          dragging && "ring-2 ring-[#3182f6]/40",
        )}
        style={{
          width: win.size.width,
          height: isCompact ? win.size.height : win.size.height,
        }}
        onPointerDown={onFocus}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle */}
        <header
          className="flex shrink-0 cursor-grab items-center gap-2 border-b border-black/[0.04] px-2.5 py-2 active:cursor-grabbing"
          onPointerDown={onDragDown}
          onPointerMove={onDragMove}
          onPointerUp={onDragUp}
          onPointerCancel={onDragUp}
          data-callout-drag-handle
        >
          <span
            className="select-none text-[11px] font-bold tracking-tight text-[#b0b8c1]"
            aria-hidden
          >
            ⋮⋮
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold text-[#191f28]">
              {title}
            </p>
            {subtitleKo ? (
              <p className="truncate text-[10px] font-semibold text-[#8b95a1]">
                {subtitleKo}
              </p>
            ) : null}
          </div>
          <div
            className="flex shrink-0 items-center gap-0.5"
            data-callout-window-chrome
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[9px] font-bold",
                win.mode === "compact"
                  ? "bg-[#191f28] text-white"
                  : "text-[#8b95a1] hover:bg-black/[0.04]",
              )}
              onClick={(e) => {
                e.stopPropagation();
                setMode("compact");
              }}
              aria-label="Compact"
            >
              −
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[9px] font-bold",
                win.mode === "floating"
                  ? "bg-[#191f28] text-white"
                  : "text-[#8b95a1] hover:bg-black/[0.04]",
              )}
              onClick={(e) => {
                e.stopPropagation();
                setMode("floating");
              }}
              aria-label="Floating"
            >
              □
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[9px] font-bold",
                win.mode === "workspace"
                  ? "bg-[#191f28] text-white"
                  : "text-[#8b95a1] hover:bg-black/[0.04]",
              )}
              onClick={(e) => {
                e.stopPropagation();
                setMode("workspace");
              }}
              aria-label="Workspace"
            >
              ▣
            </button>
            {onClose ? (
              <button
                type="button"
                className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-[#8b95a1] hover:bg-black/[0.04] hover:text-[#191f28]"
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onClose(win.id);
                }}
                aria-label="Close callout"
              >
                ×
              </button>
            ) : null}
          </div>
        </header>

        {!isCompact ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rimvio-scroll-touch p-2.5">
            <CalloutSessionProvider value={session}>
              <Callout
                objectId={win.entityId}
                compact={win.mode !== "workspace"}
              />
            </CalloutSessionProvider>
          </div>
        ) : null}

        {!isCompact ? (
          <button
            type="button"
            className="absolute bottom-1 right-1 h-4 w-4 cursor-se-resize rounded-sm bg-transparent"
            aria-label="Resize"
            data-callout-resize-handle
            onPointerDown={onResizeDown}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
            onPointerCancel={onResizeUp}
          >
            <span className="pointer-events-none absolute bottom-0.5 right-0.5 h-2 w-2 border-b-2 border-r-2 border-[#c4c4c4]" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
