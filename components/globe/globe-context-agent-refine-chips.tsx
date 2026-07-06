"use client";

import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextAgentRefineChip = {
  id: string;
  label: string;
  message: string;
};

export const CONTEXT_AGENT_REFINE_CHIPS: readonly GlobeContextAgentRefineChip[] = [
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
          className="rounded-full bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#1d1d1f] ring-1 ring-black/[0.06] active:scale-[0.98] active:bg-[#0071e3]/10 active:text-[#0071e3] disabled:opacity-45"
          data-globe-context-agent-refine-chip={chip.id}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
