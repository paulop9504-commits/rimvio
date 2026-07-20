"use client";

import type { CSSProperties, ReactNode } from "react";
import { GripHorizontal, MoveDiagonal2 } from "lucide-react";
import { useBrainSurfaceFloatingFrame } from "@/hooks/use-brain-surface-floating-frame";
import {
  getGlobeInfoFramePreset,
  type GlobeInfoFrameId,
} from "@/lib/globe/brain-surface-floating-frame-layout";
import { cn } from "@/lib/utils";

export type GlobeBrainSurfaceFloatingFrameProps = {
  frameId: GlobeInfoFrameId;
  children: ReactNode;
  className?: string;
  shellClassName?: string;
  bodyClassName?: string;
  zIndex?: number;
  dragLabel?: string;
  /** Top-left chrome slot (opacity etc.) — sibling of grab handle, not inside it. */
  dragLeading?: ReactNode;
  onDoubleReset?: boolean;
  /** When false, host controls position; frame still resizes. */
  floating?: boolean;
  style?: CSSProperties;
};

export function GlobeBrainSurfaceFloatingFrame({
  frameId,
  children,
  className,
  shellClassName,
  bodyClassName,
  zIndex = 31,
  dragLabel = "프레임 이동",
  dragLeading,
  onDoubleReset = true,
  floating = true,
  style,
}: GlobeBrainSurfaceFloatingFrameProps) {
  const preset = getGlobeInfoFramePreset(frameId);
  const {
    layout,
    frameRef,
    dragging,
    resizing,
    resetLayout,
    onDragHandlePointerDown,
    onDragHandlePointerMove,
    onDragHandlePointerUp,
    onDragHandlePointerCancel,
    onResizeHandlePointerDown,
    onResizeHandlePointerMove,
    onResizeHandlePointerUp,
    onShellTouchStart,
    onShellTouchMove,
    onShellTouchEnd,
  } = useBrainSurfaceFloatingFrame(frameId);

  const isDark = preset.tone === "dark";

  const chrome = (
    <div
      className={cn(
        "relative flex min-h-0 flex-col transition-[box-shadow,transform] duration-150",
        (dragging || resizing) && "scale-[1.01] shadow-[0_18px_44px_rgba(15,23,42,0.22)]",
        shellClassName,
      )}
      style={{ height: layout.height }}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-1.5 border-b px-2 py-1",
          isDark
            ? "border-white/10 bg-black/55 text-white/70"
            : "border-slate-200/70 bg-slate-50/95 text-slate-400",
        )}
        data-globe-brain-surface-frame-drag-chrome
      >
        {dragLeading ? (
          <div
            className="relative z-[2] flex shrink-0 items-center"
            onPointerDown={(event) => event.stopPropagation()}
            data-globe-brain-surface-frame-drag-leading
          >
            {dragLeading}
          </div>
        ) : null}
        <button
          type="button"
          aria-label={dragLabel}
          className="flex min-w-0 flex-1 cursor-grab touch-none items-center justify-center gap-1 py-0.5 active:cursor-grabbing"
          onPointerDown={onDragHandlePointerDown}
          onPointerMove={onDragHandlePointerMove}
          onPointerUp={onDragHandlePointerUp}
          onPointerCancel={onDragHandlePointerCancel}
          onDoubleClick={
            onDoubleReset
              ? (event) => {
                  event.stopPropagation();
                  resetLayout();
                }
              : undefined
          }
          data-globe-brain-surface-frame-drag-handle
        >
          <GripHorizontal className="size-3.5 shrink-0" aria-hidden />
        </button>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overscroll-contain",
          // Default scroll; hosts (e.g. Context AI) pass overflow-hidden + flex
          // so the compose footer stays pinned and never clips away.
          bodyClassName ?? "overflow-y-auto",
        )}
        data-globe-brain-surface-frame-body
      >
        {children}
      </div>

      <button
        type="button"
        aria-label="크기 조절"
        className={cn(
          "absolute bottom-1 right-1 z-[3] flex size-6 touch-none items-center justify-center rounded-full active:scale-95",
          isDark
            ? "bg-black/45 text-white/75 ring-1 ring-white/12"
            : "bg-white/90 text-slate-500 ring-1 ring-slate-200/80 shadow-sm",
        )}
        onPointerDown={onResizeHandlePointerDown}
        onPointerMove={onResizeHandlePointerMove}
        onPointerUp={onResizeHandlePointerUp}
        onPointerCancel={onResizeHandlePointerUp}
        data-globe-brain-surface-frame-resize-handle
      >
        <MoveDiagonal2 className="size-3" aria-hidden />
      </button>
    </div>
  );

  if (!floating) {
    return (
      <div
        ref={frameRef}
        className={cn("pointer-events-auto", className)}
        style={{ width: layout.width, height: layout.height, ...style }}
        data-globe-brain-surface-floating-frame={frameId}
        onTouchStart={onShellTouchStart}
        onTouchMove={onShellTouchMove}
        onTouchEnd={onShellTouchEnd}
      >
        {chrome}
      </div>
    );
  }

  return (
    <div
      ref={frameRef}
      className={cn("pointer-events-auto absolute", className)}
      style={{
        left: layout.left,
        top: layout.top,
        width: layout.width,
        height: layout.height,
        zIndex,
        ...style,
      }}
      data-globe-brain-surface-floating-frame={frameId}
      data-globe-brain-surface-frame-dragging={dragging ? "true" : "false"}
      data-globe-brain-surface-frame-resizing={resizing ? "true" : "false"}
      onTouchStart={onShellTouchStart}
      onTouchMove={onShellTouchMove}
      onTouchEnd={onShellTouchEnd}
    >
      {chrome}
    </div>
  );
}
