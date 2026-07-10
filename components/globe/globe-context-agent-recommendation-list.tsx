"use client";

import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { ContextConditionPinnedByKind } from "@/lib/globe/context-condition-ai/pin-context-condition-recommendation";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextAgentRecommendationListProps = {
  items: readonly ContextConditionRecommendation[];
  pinnedByKind?: ContextConditionPinnedByKind;
  pickBusyPlaceId?: string | null;
  onPick?: (item: ContextConditionRecommendation) => void;
  className?: string;
};

function kindEmoji(kind: ContextConditionRecommendation["kind"]): string {
  if (kind === "lodging") {
    return "🏨";
  }
  if (kind === "activity") {
    return "🎯";
  }
  if (kind === "amenity") {
    return "🏪";
  }
  return "🍜";
}

const MAX_VISIBLE = 3;

/** Ranked picks — tap row to pin (minimal). */
export function GlobeContextAgentRecommendationList({
  items,
  pinnedByKind = {
    lodging: null,
    eatery: null,
    activity: null,
    amenity: null,
  },
  pickBusyPlaceId = null,
  onPick,
  className,
}: GlobeContextAgentRecommendationListProps) {
  if (items.length === 0) {
    return null;
  }

  const visible = items.slice(0, MAX_VISIBLE);
  const pickEnabled = Boolean(onPick);

  return (
    <ul className={cn("space-y-1", className)} data-globe-context-agent-recommendations>
      {visible.map((item) => {
        const pinnedPlaceId = pinnedByKind[item.kind] ?? null;
        const isPinned = pinnedPlaceId === item.placeId;
        const isBusy = pickBusyPlaceId === item.placeId;
        const disabled = isPinned || isBusy || Boolean(pickBusyPlaceId);

        return (
          <li key={`${item.kind}-${item.placeId}`}>
            <button
              type="button"
              disabled={!pickEnabled || disabled}
              onClick={() => onPick?.(item)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12px] font-medium transition active:scale-[0.99]",
                isPinned
                  ? "bg-[#0071e3]/10 text-[#0071e3] ring-1 ring-[#0071e3]/20"
                  : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebed]",
                disabled && !isPinned && "opacity-50",
              )}
              data-globe-context-agent-recommendation
              data-globe-context-agent-recommendation-kind={item.kind}
              data-globe-context-agent-recommendation-pinned={isPinned ? "true" : "false"}
              data-globe-context-agent-pick-cta={pickEnabled && !isPinned ? "true" : undefined}
            >
              <span aria-hidden>{kindEmoji(item.kind)}</span>
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              {isPinned ? (
                <span className="shrink-0 text-[10px] font-semibold text-[#0071e3]">
                  {copy.globe.contextQuickPinDone}
                </span>
              ) : isBusy ? (
                <span className="shrink-0 text-[10px] text-[#86868b]">…</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
