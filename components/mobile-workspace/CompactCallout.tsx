"use client";

/**
 * Compact Callout — Level 1 Progressive Disclosure over the map.
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

export type CompactCalloutProps = {
  readonly entity: MobileWorkspaceEntity;
  readonly onExpand?: () => void;
  readonly onClose?: () => void;
  readonly onLongPress?: () => void;
  readonly className?: string;
};

export function CompactCallout({
  entity,
  onExpand,
  onClose,
  onLongPress,
  className,
}: CompactCalloutProps) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);

  return (
    <div
      className={cn(
        "pointer-events-auto flex min-w-[108px] max-w-[168px] items-center gap-1.5 rounded-xl bg-black/70 px-2.5 py-2 shadow-lg ring-1 ring-white/12 backdrop-blur-xl",
        className,
      )}
      data-mobile-compact-callout
      onClick={() => {
        if (longFired.current) {
          longFired.current = false;
          return;
        }
        onExpand?.();
      }}
      onPointerDown={() => {
        if (!onLongPress) return;
        longFired.current = false;
        pressTimer.current = setTimeout(() => {
          longFired.current = true;
          onLongPress();
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
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onExpand?.();
      }}
    >
      <span className="text-[18px]" aria-hidden>
        {KIND_EMOJI[entity.kind] ?? "📍"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-bold text-white">
          {entity.title}
        </p>
        <p className="truncate text-[10px] font-semibold text-white/70">
          {entity.score != null ? `${entity.score}%` : null}
          {entity.score != null && entity.subtitleKo ? " · " : null}
          {entity.subtitleKo ?? entity.priceLabelKo ?? ""}
        </p>
      </div>
      {onClose ? (
        <button
          type="button"
          className="shrink-0 rounded-full px-1 text-[14px] font-bold text-white/50"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
