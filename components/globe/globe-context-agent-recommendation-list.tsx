"use client";

import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
export type GlobeContextAgentRecommendationListProps = {
  items: readonly ContextConditionRecommendation[];
  className?: string;
};

function kindEmoji(kind: ContextConditionRecommendation["kind"]): string {
  return kind === "lodging" ? "🏨" : "🍜";
}

const RECOMMEND_LABELS = ["A", "B", "C"] as const;

/** Floating overlay — why these pins, ranked with reasons. */
export function GlobeContextAgentRecommendationList({
  items,
  className,
}: GlobeContextAgentRecommendationListProps) {
  if (items.length === 0) {
    return null;
  }

  const visible = items.slice(0, RECOMMEND_LABELS.length);

  return (
    <div className={cn("space-y-2", className)} data-globe-context-agent-recommendations>
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        {copy.globe.localDiscoveryRecommendEyebrow}
      </p>
      <ul className="space-y-1.5">
        {visible.map((item, index) => (
          <li
            key={`${item.kind}-${item.rank}-${item.title}`}
            className="rounded-xl bg-[#f5f5f7] px-2.5 py-2"
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
          </li>
        ))}
      </ul>
      <p className="text-[10px] leading-relaxed text-[#86868b]">
        {copy.globe.localDiscoveryRefineHint}
      </p>
    </div>
  );
}
