"use client";

import { Pause, Play } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import {
  formatScenarioTimeLabel,
  readActiveScenarioBranch,
  type ExperienceScenario,
  type ExperienceScenarioBranchId,
  type ItineraryDiff,
  type SimulationPlaybackState,
} from "@/lib/globe/experience-simulation";
import { cn } from "@/lib/utils";

function nodeEmoji(resourceKind: string): string {
  if (resourceKind === "lodging") {
    return "🏨";
  }
  if (resourceKind === "eatery") {
    return "🍜";
  }
  return "📍";
}

export type GlobeExperienceTimelineStripProps = {
  scenario: ExperienceScenario;
  playback: SimulationPlaybackState;
  itineraryDiff?: ItineraryDiff | null;
  onBranchChange: (branchId: ExperienceScenarioBranchId) => void;
  onTogglePlay: () => void;
  onScrub: (cursorIndex: number) => void;
  className?: string;
};

/** Flow playback — branch scenarios + timeline scrubber (Experience Simulation Runtime). */
export function GlobeExperienceTimelineStrip({
  scenario,
  playback,
  itineraryDiff = null,
  onBranchChange,
  onTogglePlay,
  onScrub,
  className,
}: GlobeExperienceTimelineStripProps) {
  const branch = readActiveScenarioBranch(scenario);
  const maxIndex = branch.nodes.length;

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl bg-[#f5f5f7] px-2.5 py-2.5 ring-1 ring-black/[0.04]",
        className,
      )}
      data-globe-experience-timeline
      data-globe-experience-branch={scenario.activeBranchId}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
          {copy.globe.experienceSimEyebrow}
        </p>
        <button
          type="button"
          onClick={onTogglePlay}
          className="inline-flex items-center gap-1 rounded-full bg-[#1d1d1f] px-2.5 py-1 text-[11px] font-semibold text-white active:scale-[0.98]"
          data-globe-experience-play-toggle
          aria-pressed={playback.playing}
        >
          {playback.playing ? (
            <Pause className="size-3" aria-hidden />
          ) : (
            <Play className="size-3" aria-hidden />
          )}
          {playback.playing
            ? copy.globe.experienceSimPause
            : copy.globe.experienceSimPlay}
        </button>
      </div>

      <div className="flex gap-1">
        {scenario.branches.map((item) => {
          const active = item.id === scenario.activeBranchId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onBranchChange(item.id)}
              className={cn(
                "min-h-7 flex-1 rounded-lg px-1.5 text-[10px] font-semibold",
                active
                  ? "bg-white text-[#0071e3] shadow-sm ring-1 ring-[#0071e3]/20"
                  : "bg-black/[0.04] text-[#86868b]",
              )}
              data-globe-experience-branch-chip={item.id}
              data-globe-experience-branch-active={active ? "true" : undefined}
            >
              {item.id} · {item.labelKo}
            </button>
          );
        })}
      </div>

      {itineraryDiff ? (
        <p className="text-[10px] font-medium text-[#ff6b4a]">
          {itineraryDiff.summaryKo}
        </p>
      ) : null}

      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
        <span
          className={cn(
            "shrink-0 rounded-lg px-2 py-1 text-[10px] font-medium",
            playback.cursorIndex === 0
              ? "bg-[#0071e3]/15 text-[#0071e3]"
              : "text-[#86868b]",
          )}
        >
          📍 {copy.globe.experienceSimAnchorLabel}
        </span>
        {branch.nodes.map((node, index) => {
          const active = node.status === "active";
          const done = node.status === "done";
          return (
            <div key={node.id} className="flex shrink-0 items-center gap-1">
              <span className="text-[#c7c7cc]" aria-hidden>
                →
              </span>
              <span
                className={cn(
                  "rounded-lg px-2 py-1 text-[10px] font-medium",
                  active && "bg-[#0071e3]/15 text-[#0071e3]",
                  done && !active && "text-[#86868b]",
                  !active && !done && "text-[#515154]",
                )}
                data-globe-experience-node={node.placeId}
                data-globe-experience-node-status={node.status}
              >
                {nodeEmoji(node.resourceKind)} {formatScenarioTimeLabel(node.scheduledAtIso)}
              </span>
            </div>
          );
        })}
      </div>

      <input
        type="range"
        min={0}
        max={maxIndex}
        step={1}
        value={playback.cursorIndex}
        onChange={(event) => onScrub(Number(event.target.value))}
        className="h-1 w-full accent-[#0071e3]"
        aria-label={copy.globe.experienceSimEyebrow}
        data-globe-experience-scrubber
      />
    </div>
  );
}
