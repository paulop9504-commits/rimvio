"use client";

import { rimvioAssistantAiBubbleClass } from "@/lib/design/globe-assistant-surface";
import type { OperatorAskChipsComposePayload } from "@/lib/globe/assistant";
import { cn } from "@/lib/utils";

export type GlobeOperatorAskChipsComposeCardProps = {
  turnId: string;
  hint: string;
  payload: OperatorAskChipsComposePayload;
  onPickChip?: (input: {
    turnId: string;
    chipId: string;
    gapId: string;
    value: string;
    labelKo: string;
    pendingTrigger: string;
  }) => void;
  className?: string;
};

/** One-screen operator ask — tap one chip to fill a trip intake gap. */
export function GlobeOperatorAskChipsComposeCard({
  turnId,
  hint,
  payload,
  onPickChip,
  className,
}: GlobeOperatorAskChipsComposeCardProps) {
  const submitted = payload.status === "submitted";

  return (
    <div
      className={cn("max-w-[88%] space-y-2", className)}
      data-globe-operator-ask-chips-compose
    >
      <p className={rimvioAssistantAiBubbleClass("text-[13px]")}>{hint}</p>
      <div
        className={cn(
          "flex flex-wrap gap-1.5 rounded-2xl bg-[#f5f5f7] p-3 ring-1 ring-black/[0.04]",
          submitted && "opacity-70",
        )}
      >
        {payload.chips.map((chip) => {
          const selected = payload.selectedChipId === chip.id;
          const isApply =
            payload.chipDomain === "research_approval" && chip.value === "apply";
          return (
            <button
              key={chip.id}
              type="button"
              disabled={submitted}
              onClick={() =>
                onPickChip?.({
                  turnId,
                  chipId: chip.id,
                  gapId: chip.gapId,
                  value: chip.value,
                  labelKo: chip.labelKo,
                  pendingTrigger: payload.pendingTrigger,
                })
              }
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]",
                selected
                  ? "bg-[#0071e3] text-white shadow-sm"
                  : isApply
                    ? "bg-[#0071e3] text-white shadow-sm hover:bg-[#0077ed]"
                    : "bg-white text-[#1d1d1f] ring-1 ring-black/[0.06] hover:bg-[#eef3ff] hover:text-[#0071e3]",
                submitted && !selected && "pointer-events-none",
              )}
              data-globe-operator-ask-chip={chip.id}
            >
              {chip.labelKo}
            </button>
          );
        })}
      </div>
      {submitted && payload.selectedSummaryKo ? (
        <p className="text-[11px] font-medium text-[#515154]">{payload.selectedSummaryKo}</p>
      ) : null}
    </div>
  );
}
