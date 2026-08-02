"use client";

/**
 * Entity Marker — Reality Entity Projection (not a plain Google pin).
 */

import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { MobileWorkspaceEntity } from "@/lib/mobile-workspace";

const KIND_EMOJI: Record<string, string> = {
  hotel: "🏨",
  restaurant: "🍣",
  attraction: "🎡",
  station: "🚉",
  poi: "📍",
  other: "📍",
};

export type EntityMarkerProps = {
  readonly entity: MobileWorkspaceEntity;
  readonly selected?: boolean;
  readonly highlighted?: boolean;
  readonly isAnchor?: boolean;
  readonly onTap?: () => void;
  readonly onDoubleTap?: () => void;
  readonly onLongPress?: () => void;
  readonly className?: string;
};

export function EntityMarker({
  entity,
  selected = false,
  highlighted = false,
  isAnchor = false,
  onTap,
  onDoubleTap,
  onLongPress,
  className,
}: EntityMarkerProps) {
  const lastTapRef = useRef(0);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);

  return (
    <button
      type="button"
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full text-[20px] shadow-lg ring-2 transition",
        selected || isAnchor
          ? "bg-white ring-[#0a84ff] scale-110"
          : highlighted
            ? "bg-white/95 ring-white/80"
            : "bg-black/55 ring-white/20 backdrop-blur-md",
        className,
      )}
      data-mobile-entity-marker={entity.id}
      data-selected={selected ? "true" : "false"}
      aria-label={entity.title}
      onClick={() => {
        if (longFired.current) {
          longFired.current = false;
          return;
        }
        const now = Date.now();
        if (now - lastTapRef.current < 280) {
          onDoubleTap?.();
          lastTapRef.current = 0;
          return;
        }
        lastTapRef.current = now;
        window.setTimeout(() => {
          if (Date.now() - lastTapRef.current >= 260) onTap?.();
        }, 270);
      }}
      onPointerDown={() => {
        longFired.current = false;
        pressTimer.current = setTimeout(() => {
          longFired.current = true;
          onLongPress?.();
        }, 480);
      }}
      onPointerUp={() => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }}
      onPointerLeave={() => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress?.();
      }}
    >
      {KIND_EMOJI[entity.kind] ?? "📍"}
    </button>
  );
}
