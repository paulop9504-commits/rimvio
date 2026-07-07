"use client";

import { copy } from "@/lib/copy/human-ko";
import { rimvioAssistantRefineChipClass } from "@/lib/design/globe-assistant-surface";
import { cn } from "@/lib/utils";

export type GlobeContextAgentRefineChip = {
  id: string;
  label: string;
  message: string;
};

export const CONTEXT_AGENT_REFINE_CHIPS: readonly GlobeContextAgentRefineChip[] = [
  { id: "alternate", label: copy.globe.localDiscoveryRefineAlternate, message: "다른 곳 보여줘" },
  { id: "cheaper", label: copy.globe.localDiscoveryRefineCheaper, message: "조금 더 싸게" },
  { id: "quieter", label: copy.globe.localDiscoveryRefineQuieter, message: "더 조용한 곳" },
  { id: "closer", label: copy.globe.localDiscoveryRefineCloser, message: "더 가까운 곳" },
];

export type GlobeContextAgentRefineChipsProps = {
  onSelect: (message: string) => void;
  disabled?: boolean;
  className?: string;
};

/** MVP C — one-tap replan without typing. */
export function GlobeContextAgentRefineChips({
  onSelect,
  disabled = false,
  className,
}: GlobeContextAgentRefineChipsProps) {
  return (
    <div
      className={cn("flex flex-wrap gap-1.5", className)}
      data-globe-context-agent-refine-chips
    >
      {CONTEXT_AGENT_REFINE_CHIPS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(chip.message)}
          className={rimvioAssistantRefineChipClass()}
          data-globe-context-agent-refine-chip={chip.id}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
