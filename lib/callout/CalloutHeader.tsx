"use client";

import type { CalloutViewModel } from "@/lib/callout/types";
import { cn } from "@/lib/utils";

export function CalloutHeader({
  model,
  className,
}: {
  model: CalloutViewModel;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.04em] text-[#8b95a1]">
            {model.typeLabelKo}
          </p>
          <h3 className="truncate text-[15px] font-bold tracking-[-0.02em] text-[#191f28]">
            {model.object.title}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-[#191f28] px-2.5 py-1 text-[10px] font-semibold text-white">
          {model.stateLabelKo}
        </span>
      </div>

      <ol className="flex items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {model.lifecycle.map((step, i) => (
          <li key={step.state} className="flex items-center gap-1">
            {i > 0 ? (
              <span className="text-[9px] text-[#d1d6db]" aria-hidden>
                →
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                step.reached
                  ? "bg-[#e8f3ff] text-[#3182f6]"
                  : "bg-[#f2f4f6] text-[#c4c9d0]",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  step.reached ? "bg-[#3182f6]" : "bg-[#d1d6db]",
                )}
              />
              {step.labelKo}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
