"use client";

/**
 * Compact Osaka Metro legend — color swatch + short line name.
 * Hangul-safe (DOM); pairs with on-map HTML labels.
 */

import {
  OSAKA_METRO_LINE_CATALOG,
  type OsakaMetroLineId,
} from "@/lib/geo/osaka-metro/line-catalog";
import { cn } from "@/lib/utils";

export type OsakaMetroLineLegendProps = {
  readonly visibleLineIds: readonly OsakaMetroLineId[];
  readonly className?: string;
};

export function OsakaMetroLineLegend({
  visibleLineIds,
  className,
}: OsakaMetroLineLegendProps) {
  if (visibleLineIds.length === 0) return null;

  const idSet = new Set(visibleLineIds);
  const rows = OSAKA_METRO_LINE_CATALOG.filter((e) => idSet.has(e.id));
  if (rows.length === 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-2 top-2 z-[5] max-w-[min(100%,11.5rem)]",
        className,
      )}
      data-osaka-metro-legend
    >
      <div className="rounded-xl bg-white/92 px-2 py-1.5 shadow-[0_4px_16px_rgba(25,31,40,0.12)] ring-1 ring-black/[0.05] backdrop-blur-md">
        <p className="mb-1 px-0.5 text-[9px] font-semibold tracking-wide text-[#8b95a1]">
          오사카 노선
        </p>
        <ul className="flex max-h-[min(36dvh,220px)] flex-col gap-0.5 overflow-y-auto">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-1.5 px-0.5 py-px"
            >
              <span
                className="h-1 w-3.5 shrink-0 rounded-full"
                style={{ background: row.color }}
                aria-hidden
              />
              <span className="truncate text-[11px] font-semibold leading-tight tracking-[-0.02em] text-[#191f28]">
                {row.shortLabelKo}
                <span className="font-medium text-[#8b95a1]">선</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
