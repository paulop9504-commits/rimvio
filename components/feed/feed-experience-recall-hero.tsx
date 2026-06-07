"use client";

import { memo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SpatialMediaSyncPlayer } from "@/components/experience/spatial-media-sync-player";
import { FeedExperienceRunChips } from "@/components/feed/feed-experience-run-chips";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

export type FeedExperienceRecallHeroProps = {
  volume: ExperienceVolume | null;
  headline: string | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  runDeferred?: boolean;
  onRunMention?: (featureId: string) => void;
  className?: string;
};

/** YT Music-style top recall — mini bar ↔ full Globe player, one tap. */
export const FeedExperienceRecallHero = memo(function FeedExperienceRecallHero({
  volume,
  headline,
  expanded,
  onToggleExpanded,
  runDeferred = false,
  onRunMention,
  className,
}: FeedExperienceRecallHeroProps) {
  const copy = useCopy();
  const recallCopy = copy.feed.experience.recall;

  if (!volume) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center border-b border-white/8 bg-white/[0.02] px-4 py-8",
          className,
        )}
        data-feed-recall-hero
        data-feed-recall-state="empty"
      >
        <p className="max-w-[16rem] text-center text-[13px] leading-relaxed text-white/42">
          {recallCopy.empty}
        </p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        className={cn(
          "flex w-full shrink-0 items-center gap-3 border-b border-white/8 bg-gradient-to-b from-white/[0.05] to-transparent px-4 py-3 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.995]",
          className,
        )}
        data-feed-recall-hero
        data-feed-recall-state="mini"
        onClick={onToggleExpanded}
        aria-expanded={false}
        aria-label={recallCopy.expand}
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-lg ring-1 ring-sky-300/25">
          🧭
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-white">{headline ?? volume.title}</p>
          <p className="mt-0.5 text-[12px] text-white/45">{recallCopy.miniHint}</p>
        </div>
        <span className="shrink-0 rounded-full border border-sky-300/35 bg-sky-500/15 px-2.5 py-1 text-[10px] font-bold text-sky-100/95">
          {copy.feed.experience.recallChip}
        </span>
        <ChevronUp className="size-5 shrink-0 text-white/35" aria-hidden />
      </button>
    );
  }

  return (
    <section
      className={cn(
        "flex min-h-0 shrink-0 flex-col border-b border-white/8 bg-[#080a10]",
        "max-h-[min(52vh,420px)] min-h-[min(38vh,320px)]",
        className,
      )}
      data-feed-recall-hero
      data-feed-recall-state="full"
      aria-label={recallCopy.expand}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/35">
            {copy.feed.experience.recallChip}
          </p>
          <p className="truncate text-[16px] font-semibold text-white">{headline ?? volume.title}</p>
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/85"
          onClick={onToggleExpanded}
          aria-expanded
          aria-label={recallCopy.collapse}
        >
          {recallCopy.collapse}
          <ChevronDown className="size-4" aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SpatialMediaSyncPlayer volume={volume} />
        {onRunMention ? (
          <div className="mt-4 border-t border-white/8 pt-3">
            <FeedExperienceRunChips deferred={runDeferred} onRun={onRunMention} />
          </div>
        ) : null}
      </div>
    </section>
  );
});
