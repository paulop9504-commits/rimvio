"use client";

/**
 * EntityMarker — Entity Node on Globe Reality Interface.
 * Projection only — no edit, no Reality mutation.
 */

import { Box } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RealityProjectionNode } from "@/lib/globe/reality-interface";

export type EntityMarkerProps = {
  readonly node: RealityProjectionNode;
  readonly selected?: boolean;
  readonly compact?: boolean;
  readonly onSelect?: (node: RealityProjectionNode) => void;
  readonly className?: string;
};

export function EntityMarker({
  node,
  selected = false,
  compact = false,
  onSelect,
  className,
}: EntityMarkerProps) {
  if (compact) {
    return (
      <button
        type="button"
        data-entity-marker
        data-entity-id={node.entityId ?? node.id}
        data-read-only="true"
        aria-label={node.titleKo}
        aria-pressed={selected}
        onClick={() => onSelect?.(node)}
        className={cn(
          "inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-white/95 px-2.5 shadow-[0_6px_18px_rgba(2,32,71,0.16)] ring-1 ring-black/[0.06] backdrop-blur-md active:scale-[0.97]",
          selected && "ring-2 ring-[#0ca678]/45",
          className,
        )}
      >
        <Box className="h-3.5 w-3.5 text-[#0ca678]" aria-hidden />
        <span className="ml-1.5 max-w-[7rem] truncate text-[12px] font-semibold text-[#191f28]">
          {node.titleKo}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-entity-marker
      data-entity-id={node.entityId ?? node.id}
      data-read-only="true"
      aria-pressed={selected}
      onClick={() => onSelect?.(node)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[1rem] bg-white/94 px-3 py-2.5 text-left shadow-[0_6px_20px_rgba(2,32,71,0.1)] ring-1 ring-black/[0.05] backdrop-blur-xl active:scale-[0.99]",
        selected && "ring-2 ring-[#0ca678]/35",
        className,
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#12b886]/12">
        <Box className="h-3.5 w-3.5 text-[#0ca678]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-[#8b95a1]">
          Entity Node
        </p>
        <p className="truncate text-[13px] font-semibold text-[#191f28]">
          {node.titleKo}
        </p>
        {node.subtitleKo ? (
          <p className="truncate text-[11px] text-[#6b7684]">{node.subtitleKo}</p>
        ) : null}
      </div>
    </button>
  );
}
