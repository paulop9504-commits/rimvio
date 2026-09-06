"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HARNESS_LABELLING_STEPS,
  type HarnessLabellingStepId,
} from "@/lib/harness/labelling";

export function HarnessLabellingStepNav({
  currentStep,
  completedThrough,
  onStepClick,
}: {
  currentStep: HarnessLabellingStepId;
  /** Highest step index that has been completed (0 = none). */
  completedThrough: number;
  onStepClick: (step: HarnessLabellingStepId) => void;
}) {
  return (
    <nav className="flex w-full flex-col gap-1 border-r border-[#E2E8F0] bg-[#FAFBFC] p-3 lg:w-[220px] lg:shrink-0">
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
        Labelling
      </p>
      {HARNESS_LABELLING_STEPS.map((step) => {
        const active = step.id === currentStep;
        const done = step.id <= completedThrough;
        const locked = step.id > completedThrough + 1;
        return (
          <button
            key={step.id}
            type="button"
            disabled={locked}
            onClick={() => onStepClick(step.id)}
            className={cn(
              "flex items-start gap-2 rounded-xl px-2.5 py-2 text-left transition",
              active && "bg-white shadow-sm ring-1 ring-[#E2E8F0]",
              !active && !locked && "hover:bg-white/80",
              locked && "cursor-not-allowed opacity-40",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                active && "bg-[#6366F1] text-white",
                done && !active && "bg-[#22C55E] text-white",
                !done && !active && "bg-[#E2E8F0] text-[#64748B]",
              )}
            >
              {done && !active ? <Check className="h-3 w-3" /> : step.id}
            </span>
            <span>
              <span className="block text-[12px] font-semibold text-[#0F172A]">{step.title}</span>
              <span className="block text-[10px] leading-snug text-[#94A3B8]">{step.description}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
