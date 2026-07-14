"use client";

import type { EateryRankMode } from "@/lib/globe/eatery/eatery-rank-profile";
import { copy } from "@/lib/copy/human-ko";
import { rimvioAssistantRefineChipClass } from "@/lib/design/globe-assistant-surface";
import { cn } from "@/lib/utils";

export type GlobeEateryRankModeChipsProps = {
  mode: EateryRankMode;
  onSelect: (mode: EateryRankMode) => void;
  disabled?: boolean;
  className?: string;
};

const CHIPS: readonly { id: EateryRankMode; label: string }[] = [
  { id: "auto", label: copy.globe.eateryRankModeAutoChip },
  { id: "local", label: copy.globe.eateryRankModeLocalChip },
  { id: "value", label: copy.globe.eateryRankModeValueChip },
  { id: "distance", label: copy.globe.eateryRankModeDistanceChip },
  { id: "popular", label: copy.globe.eateryRankModePopularChip },
];

/** Discovery feed eatery rank preset — default `auto` (맞춤 자동). */
export function GlobeEateryRankModeChips({
  mode,
  onSelect,
  disabled = false,
  className,
}: GlobeEateryRankModeChipsProps) {
  return (
    <div
      className={cn("flex flex-wrap gap-1.5", className)}
      data-globe-eatery-rank-mode-chips
      role="group"
      aria-label={copy.globe.eateryRankModeGroupAria}
    >
      {CHIPS.map((chip) => {
        const active = mode === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(chip.id)}
            className={rimvioAssistantRefineChipClass(
              cn(
                active &&
                  "bg-[#0071e3]/10 text-[#0071e3] ring-1 ring-[#0071e3]/25",
              ),
            )}
            data-globe-eatery-rank-mode-chip={chip.id}
            data-globe-eatery-rank-mode-active={active ? "true" : "false"}
            aria-pressed={active}
          >
            {active ? "● " : null}
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
