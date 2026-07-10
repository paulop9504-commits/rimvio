"use client";

import { GlobeContextAgentRecommendationList } from "@/components/globe/globe-context-agent-recommendation-list";
import { rimvioAssistantAiBubbleClass } from "@/lib/design/globe-assistant-surface";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { ContextConditionPinnedByKind } from "@/lib/globe/context-condition-ai/pin-context-condition-recommendation";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextScoutResultCardProps = {
  summaryKo: string;
  items: readonly ContextConditionRecommendation[];
  pinnedByKind?: ContextConditionPinnedByKind;
  pickBusyPlaceId?: string | null;
  onPick?: (item: ContextConditionRecommendation) => void;
  className?: string;
};

/** Scout outcome embedded in the compose thread — summary + ranked picks. */
export function GlobeContextScoutResultCard({
  summaryKo,
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
}: GlobeContextScoutResultCardProps) {
  return (
    <div
      className={cn("max-w-[88%] space-y-2", className)}
      data-globe-scout-result-card
    >
      <p className={rimvioAssistantAiBubbleClass("text-[13px]")}>{summaryKo}</p>
      <GlobeContextAgentRecommendationList
        items={items}
        pinnedByKind={pinnedByKind}
        pickBusyPlaceId={pickBusyPlaceId}
        onPick={onPick}
      />
      {onPick && items.length > 0 ? (
        <p className="px-1 text-[10px] leading-relaxed text-[#86868b]">
          {copy.globe.contextScoutCardPickHint}
        </p>
      ) : null}
    </div>
  );
}
