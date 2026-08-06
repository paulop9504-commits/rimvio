"use client";

/**
 * Map Why Highlight — ONE glow card on the pin (Rimvio clutter ban).
 *
 * Locked UX (Image 3 pattern):
 *   Map  → pin + Why This Place (only)
 *   Sheet → Why / Price / Review / Surroundings tabs
 *
 * Never render Price / Trace / Surroundings / spoke fragment cards on the map.
 */

import type { ObjectDecisionSpokeSet } from "@/lib/context-workspace/projection/build-object-decision-spokes";
import type { SpatialDecisionOverlay } from "@/lib/context-workspace/projection/build-spatial-decision-overlay";
import type { ObjectFacetId } from "@/lib/mobile-workspace/object-facets";
import { cn } from "@/lib/utils";

export type ScreenAnchor = { readonly x: number; readonly y: number };

export type ObjectDecisionSpokeOverlayProps = {
  /** @deprecated Spokes no longer drawn on map — entity id fallback only */
  readonly spokeSet?: ObjectDecisionSpokeSet | null;
  readonly anchor: ScreenAnchor | null;
  readonly activeFacetId?: ObjectFacetId | null;
  readonly onSelectFacet?: (facetId: ObjectFacetId) => void;
  /** Why highlight payload (single card) */
  readonly spatialOverlay?: SpatialDecisionOverlay | null;
  readonly onOpenActionSheet?: () => void;
  readonly className?: string;
};

/**
 * Single Why This Place card above the selected pin.
 */
export function ObjectDecisionSpokeOverlay({
  spokeSet = null,
  anchor,
  onSelectFacet,
  spatialOverlay = null,
  onOpenActionSheet,
  className,
}: ObjectDecisionSpokeOverlayProps) {
  const primary = spatialOverlay?.target ?? null;
  if (!anchor || !primary) return null;

  const cardTop = Math.max(10, anchor.y - 168);
  const reasons = primary.reasonsKo.slice(0, 3);
  const entityId = primary.id || spokeSet?.entityId || "";

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[7] overflow-hidden",
        className,
      )}
      data-object-decision-spoke-overlay
      data-why-highlight-only="true"
      data-entity={entityId}
      data-spoke-count="0"
      data-has-primary-float="false"
      data-has-compact-chip="false"
      data-has-why-highlight="true"
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient
            id="rimvio-decision-beam"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#69a7ff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#3182f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1={anchor.x}
          y1={anchor.y - 10}
          x2={anchor.x}
          y2={Math.min(anchor.y - 10, cardTop + 120)}
          stroke="url(#rimvio-decision-beam)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle
          cx={anchor.x}
          cy={anchor.y}
          r={7}
          fill="#3182f6"
          opacity={0.28}
        />
        <circle
          cx={anchor.x}
          cy={anchor.y}
          r={4.5}
          fill="#ffffff"
          stroke="#3182f6"
          strokeWidth={2}
        />
      </svg>

      <button
        type="button"
        className={cn(
          "pointer-events-auto absolute w-[min(280px,calc(100vw-24px))] overflow-hidden rounded-3xl text-left",
          "bg-[#0f1218]/86 backdrop-blur-2xl",
          "shadow-[0_14px_40px_rgba(15,23,42,0.42),0_0_0_1px_rgba(105,167,255,0.32)]",
          "-translate-x-1/2",
        )}
        style={{ left: anchor.x, top: cardTop, zIndex: 16 }}
        data-spatial-why-highlight
        data-spatial-decision-chip
        onClick={() => {
          onSelectFacet?.("why");
          onOpenActionSheet?.();
        }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3.5 py-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#69a7ff] shadow-[0_0_10px_#69a7ff]" />
            <span className="truncate text-[11px] font-semibold tracking-wide text-[#9ec5ff]">
              Why This Place
            </span>
          </div>
          {primary.matchPercent != null ? (
            <span className="shrink-0 rounded-full border border-[#69a7ff]/35 bg-[#3182f6]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#cfe2ff]">
              {primary.matchPercent}%
            </span>
          ) : null}
        </div>

        <div className="space-y-2 px-3.5 py-3">
          <h4 className="truncate text-[14px] font-bold tracking-[-0.02em] text-white">
            {primary.titleKo}
          </h4>
          <ul className="space-y-1.5">
            {reasons.map((line) => (
              <li
                key={line}
                className="flex gap-2 text-[12px] font-medium leading-snug text-[#d5dbe6]"
              >
                <span className="mt-0.5 shrink-0 text-[#69a7ff]">•</span>
                <span className="line-clamp-2">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-white/10 px-3.5 py-2 text-[11px] font-semibold text-[#8b95a1]">
          탭하면 가격 · 리뷰 · 주변은 하단에서
        </div>
      </button>
    </div>
  );
}
