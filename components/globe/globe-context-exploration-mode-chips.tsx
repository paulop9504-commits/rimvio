"use client";

import type { ExplorationMode } from "@/lib/globe/discovery-policy";
import { copy } from "@/lib/copy/human-ko";
import { rimvioAssistantRefineChipClass } from "@/lib/design/globe-assistant-surface";
import { cn } from "@/lib/utils";

export type GlobeContextExplorationModeChipsProps = {
  mode: ExplorationMode;
  onSelect: (mode: ExplorationMode) => void;
  disabled?: boolean;
  className?: string;
};

const CHIPS: readonly { id: ExplorationMode; label: string }[] = [
  { id: "convergent", label: copy.globe.explorationModeConvergentChip },
  { id: "diffuse", label: copy.globe.explorationModeDiffuseChip },
];

/** Scout distribution — verified center vs tail exploration (1 tap). */
export function GlobeContextExplorationModeChips({
  mode,
  onSelect,
  disabled = false,
  className,
}: GlobeContextExplorationModeChipsProps) {
  return (
    <div
      className={cn("flex gap-1.5", className)}
      data-globe-exploration-mode-chips
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
            data-globe-exploration-mode-chip={chip.id}
            data-globe-exploration-mode-active={active ? "true" : "false"}
            aria-pressed={active}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
