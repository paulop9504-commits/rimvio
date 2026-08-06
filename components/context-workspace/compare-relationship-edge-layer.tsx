"use client";

/**
 * Compare Relationship Edge Layer — Object → Relationship → Decision.
 *
 * Visual (not a card list):
 *   Hotel A
 *      |
 *     12분
 *      |
 *     USJ
 *
 * Screen anchors only — reuses pin projection engine. Compare Mode only.
 */

import type { CompareRelationshipEdge } from "@/lib/context-workspace/projection/build-compare-relationship-edges";
import { cn } from "@/lib/utils";

export type ScreenPosition = {
  readonly x: number;
  readonly y: number;
};

export type CompareRelationshipEdgeLayerProps = {
  /** When false / empty → render nothing (Default Map hidden). */
  readonly active: boolean;
  readonly edges: readonly CompareRelationshipEdge[];
  readonly anchors: Readonly<Record<string, ScreenPosition>>;
  readonly titles?: Readonly<Record<string, string>>;
  readonly className?: string;
};

function mid(
  a: ScreenPosition,
  b: ScreenPosition,
): ScreenPosition {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function CompareRelationshipEdgeLayer({
  active,
  edges,
  anchors,
  titles = {},
  className,
}: CompareRelationshipEdgeLayerProps) {
  if (!active || edges.length === 0) return null;

  const drawable = edges.filter(
    (e) => anchors[e.from] != null && anchors[e.to] != null,
  );
  if (drawable.length === 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[5] overflow-hidden",
        className,
      )}
      data-compare-relationship-edge-layer
      data-edge-count={drawable.length}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      >
        {drawable.map((edge) => {
          const a = anchors[edge.from]!;
          const b = anchors[edge.to]!;
          const isRoute = edge.type === "route";
          const isCompare = edge.type === "compare";
          return (
            <g key={edge.id} data-edge-type={edge.type}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={isCompare ? "#007aff" : isRoute ? "#007aff" : "#8e8e93"}
                strokeWidth={isCompare ? 1.5 : 2}
                strokeDasharray={isRoute ? "5 5" : isCompare ? "3 4" : undefined}
                strokeLinecap="round"
                opacity={isCompare ? 0.35 : 0.55}
              />
            </g>
          );
        })}
      </svg>

      {drawable.map((edge) => {
        const a = anchors[edge.from]!;
        const b = anchors[edge.to]!;
        const m = mid(a, b);
        const fromTitle = titles[edge.from];
        const toTitle = titles[edge.to];
        // Vertical stack metaphor when nearly vertical; else mid chip only.
        const dy = Math.abs(b.y - a.y);
        const dx = Math.abs(b.x - a.x);
        const vertical = dy > dx * 1.15;

        return (
          <div
            key={`label:${edge.id}`}
            className="absolute flex flex-col items-center"
            style={{
              left: m.x,
              top: m.y,
              transform: "translate(-50%, -50%)",
            }}
            data-edge-label={edge.id}
            data-edge-type={edge.type}
          >
            {vertical && fromTitle ? (
              <span className="mb-0.5 max-w-[88px] truncate text-[9px] font-semibold text-[#1c1c1e]/80">
                {fromTitle}
              </span>
            ) : null}
            {vertical ? (
              <span className="h-2 w-px bg-[#007aff]/50" aria-hidden />
            ) : null}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums shadow-[0_4px_12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] backdrop-blur-md",
                edge.type === "compare"
                  ? "bg-white/80 text-[#8e8e93]"
                  : "bg-white/94 text-[#007aff]",
              )}
            >
              {edge.label}
            </span>
            {vertical ? (
              <span className="h-2 w-px bg-[#007aff]/50" aria-hidden />
            ) : null}
            {vertical && toTitle ? (
              <span className="mt-0.5 max-w-[88px] truncate text-[9px] font-semibold text-[#1c1c1e]/80">
                {toTitle}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
