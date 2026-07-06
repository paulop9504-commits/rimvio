"use client";

import { copy } from "@/lib/copy/human-ko";
import type { ContextAgentInterpretation } from "@/lib/globe/context-agent/context-agent-interpretation-store";
import { cn } from "@/lib/utils";

const MAX_TIMELINE_STEPS = 5;

export type GlobeContextAgentInterpretationPanelProps = {
  interpretation: ContextAgentInterpretation | null;
  className?: string;
};

/** Messy-input interpretation — understanding line + compact plan timeline. */
export function GlobeContextAgentInterpretationPanel({
  interpretation,
  className,
}: GlobeContextAgentInterpretationPanelProps) {
  if (!interpretation) {
    return null;
  }

  const steps = interpretation.visualization.timeline.slice(0, MAX_TIMELINE_STEPS);
  const hiddenStepCount =
    interpretation.visualization.timeline.length - steps.length;
  const primaryCard =
    interpretation.visualization.cards.find((card) => card.emphasis === "primary") ??
    interpretation.visualization.cards[0];

  return (
    <div
      className={cn(
        "space-y-2.5 rounded-2xl border border-[#0071e3]/12 bg-[#0071e3]/[0.04] px-3 py-2.5",
        className,
      )}
      data-globe-context-agent-interpretation
    >
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#0071e3]/70">
          {copy.globe.contextAgentInterpretationEyebrow}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#1d1d1f]">
          {interpretation.understandingKo}
        </p>
        {primaryCard &&
        primaryCard.bodyKo !== interpretation.understandingKo &&
        primaryCard.bodyKo.length <= 120 ? (
          <p className="mt-1 text-[11px] leading-relaxed text-[#515154]">
            {primaryCard.bodyKo}
          </p>
        ) : null}
      </div>

      {steps.length > 0 ? (
        <div className="space-y-1.5 border-t border-[#0071e3]/10 pt-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#86868b]">
            {copy.globe.contextAgentInterpretationSteps}
          </p>
          <ol className="space-y-1">
            {steps.map((step, index) => (
              <li
                key={`${step.timeLabel}-${step.titleKo}-${index}`}
                className="flex items-start gap-2 text-[11px] leading-snug text-[#1d1d1f]"
              >
                <span className="mt-0.5 shrink-0 rounded-full bg-[#0071e3]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[#0071e3]">
                  {index + 1}
                </span>
                <span>
                  <span className="font-medium">{step.titleKo}</span>
                  {step.detailKo ? (
                    <span className="text-[#86868b]"> — {step.detailKo}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
          {hiddenStepCount > 0 ? (
            <p className="text-[10px] text-[#86868b]">+{hiddenStepCount}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
