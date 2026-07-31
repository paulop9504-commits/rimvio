"use client";

/**
 * Reality Draft Day View — one quiet composition: day rail + tappable places.
 * Chat projects the same SSOT as map pins (Prepared, not essay).
 */

import type { RealityDraft } from "@/lib/context-workspace/reality-draft";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type RealityDraftItineraryCardProps = {
  draft: RealityDraft;
  onFocusNode?: (nodeId: string) => void;
  activeNodeId?: string | null;
  className?: string;
};

export function RealityDraftItineraryCard({
  draft,
  onFocusNode,
  activeNodeId = null,
  className,
}: RealityDraftItineraryCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] bg-white/95 shadow-[0_8px_24px_rgba(25,31,40,0.08)]",
        className,
      )}
      data-reality-draft-itinerary
    >
      <header className="px-3.5 pb-2.5 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-tight text-[#8b95a1]">
              {copy.globe.realityDraftEyebrow}
            </p>
            <h3 className="mt-0.5 truncate text-[15px] font-semibold tracking-[-0.02em] text-[#191f28]">
              {draft.contextTitleKo}
            </h3>
          </div>
          <span className="shrink-0 rounded-full bg-[#e8f3ff] px-2 py-0.5 text-[10px] font-semibold text-[#3182f6]">
            {copy.globe.actionReadyStateReady}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-[#8b95a1]">
          {copy.globe.realityDraftPreparedHint}
        </p>
      </header>

      <div className="px-3.5 pb-3.5">
        <ol className="relative space-y-0">
          {draft.days.map((day, dayIndex) => {
            const isLast = dayIndex === draft.days.length - 1;
            return (
              <li
                key={day.day}
                className="relative flex gap-3"
                data-reality-draft-day={day.day}
              >
                <div className="flex w-5 shrink-0 flex-col items-center">
                  <span
                    className="mt-1.5 flex h-2 w-2 rounded-full bg-[#3182f6] shadow-[0_0_0_3px_rgba(49,130,246,0.15)]"
                    aria-hidden
                  />
                  {!isLast ? (
                    <span
                      className="mt-1 w-px flex-1 bg-gradient-to-b from-[#d1d6db] to-transparent"
                      aria-hidden
                    />
                  ) : null}
                </div>

                <div className={cn("min-w-0 flex-1", !isLast && "pb-3.5")}>
                  <p className="text-[12px] font-semibold tracking-tight text-[#191f28]">
                    <span className="mr-1" aria-hidden>
                      {day.emoji}
                    </span>
                    {day.labelKo}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {day.nodes.map((node) => {
                      const active = activeNodeId === node.nodeId;
                      return (
                        <button
                          key={node.nodeId}
                          type="button"
                          className={cn(
                            "max-w-full truncate rounded-[10px] px-2.5 py-1.5 text-left text-[11px] font-medium tracking-tight transition-[transform,background-color,color,box-shadow] duration-150 active:scale-[0.98]",
                            active
                              ? "bg-[#3182f6] text-white shadow-[0_4px_12px_rgba(49,130,246,0.28)]"
                              : "bg-[#f2f4f6] text-[#191f28] hover:bg-[#ebedf0]",
                          )}
                          onClick={() => onFocusNode?.(node.nodeId)}
                          data-reality-draft-entity={node.nodeId}
                          aria-pressed={active}
                        >
                          <span className="mr-1 opacity-90" aria-hidden>
                            {node.emoji}
                          </span>
                          {node.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
