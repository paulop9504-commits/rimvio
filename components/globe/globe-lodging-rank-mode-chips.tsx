"use client";

import type { LodgingRankMode } from "@/lib/globe/lodging/lodging-rank-profile";
import { copy } from "@/lib/copy/human-ko";
import { rimvioAssistantRefineChipClass } from "@/lib/design/globe-assistant-surface";
import { cn } from "@/lib/utils";

export type GlobeLodgingRankModeChipsProps = {
  mode: LodgingRankMode;
  onSelect: (mode: LodgingRankMode) => void;
  disabled?: boolean;
  className?: string;
};

const CHIPS: readonly { id: LodgingRankMode; label: string }[] = [
  { id: "auto", label: copy.globe.lodgingRankModeAutoChip },
  { id: "value", label: copy.globe.lodgingRankModeValueChip },
  { id: "distance", label: copy.globe.lodgingRankModeDistanceChip },
  { id: "popular", label: copy.globe.lodgingRankModePopularChip },
  { id: "premium", label: copy.globe.lodgingRankModePremiumChip },
];

/** Hub lodging rank preset — default `auto` (맞춤 자동). */
export function GlobeLodgingRankModeChips({
  mode,
  onSelect,
  disabled = false,
  className,
}: GlobeLodgingRankModeChipsProps) {
  return (
    <div
      className={cn("flex flex-wrap gap-1.5", className)}
      data-globe-lodging-rank-mode-chips
      role="group"
      aria-label={copy.globe.lodgingRankModeGroupAria}
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
            data-globe-lodging-rank-mode-chip={chip.id}
            data-globe-lodging-rank-mode-active={active ? "true" : "false"}
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
