"use client";

import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextAgentRecommendationListProps = {
  items: readonly ContextConditionRecommendation[];
  pinnedByKind?: { lodging: string | null; eatery: string | null };
  pickBusyPlaceId?: string | null;
  onPick?: (item: ContextConditionRecommendation) => void;
  className?: string;
};

function kindEmoji(kind: ContextConditionRecommendation["kind"]): string {
  return kind === "lodging" ? "🏨" : "🍜";
}

const RECOMMEND_LABELS = ["A", "B", "C"] as const;

/** Floating overlay — why these pins, ranked with reasons + human final gate. */
export function GlobeContextAgentRecommendationList({
  items,
  pinnedByKind = { lodging: null, eatery: null },
  pickBusyPlaceId = null,
  onPick,
  className,
}: GlobeContextAgentRecommendationListProps) {
  if (items.length === 0) {
    return null;
  }

  const visible = items.slice(0, RECOMMEND_LABELS.length);
  const pickEnabled = Boolean(onPick);

  return (
    <div className={cn("space-y-2", className)} data-globe-context-agent-recommendations>
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        {copy.globe.localDiscoveryRecommendEyebrow}
      </p>
      <ul className="space-y-1.5">
        {visible.map((item, index) => {
          const pinnedPlaceId =
            item.kind === "lodging" ? pinnedByKind.lodging : pinnedByKind.eatery;
          const isPinned = pinnedPlaceId === item.placeId;
          const isBusy = pickBusyPlaceId === item.placeId;

          return (
            <li
              key={`${item.kind}-${item.placeId}`}
              className={cn(
                "rounded-xl px-2.5 py-2",
                isPinned
                  ? "bg-[#0071e3]/10 ring-1 ring-[#0071e3]/25"
                  : "bg-[#f5f5f7]",
              )}
              data-globe-context-agent-recommendation
              data-globe-context-agent-recommendation-kind={item.kind}
              data-globe-context-agent-recommendation-pinned={isPinned ? "true" : "false"}
            >
              <p className="truncate text-[12px] font-semibold text-[#1d1d1f]">
                <span className="mr-1.5 inline-flex size-4 items-center justify-center rounded-full bg-[#1d1d1f] text-[9px] font-bold text-white">
                  {RECOMMEND_LABELS[index]}
                </span>
                {kindEmoji(item.kind)} {item.title}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[#515154]">
                {item.reasonKo}
              </p>
              {pickEnabled ? (
                <div className="mt-2">
                  {isPinned ? (
                    <p className="text-center text-[11px] font-semibold text-[#0071e3]">
                      {copy.globe.contextQuickPinDone}
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy || Boolean(pickBusyPlaceId)}
                      onClick={() => onPick?.(item)}
                      className={cn(
                        "flex h-8 w-full items-center justify-center rounded-lg text-[12px] font-semibold transition active:scale-[0.98]",
                        isBusy
                          ? "bg-[#0071e3]/60 text-white"
                          : "bg-[#0071e3] text-white shadow-sm",
                      )}
                      data-globe-context-agent-pick-cta
                    >
                      {copy.globe.localDiscoveryPickCta}
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] leading-relaxed text-[#86868b]">
        {copy.globe.localDiscoveryRefineHint}
      </p>
    </div>
  );
}
