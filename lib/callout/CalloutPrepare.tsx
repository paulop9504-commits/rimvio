"use client";

import { Check } from "lucide-react";
import type { CalloutViewModel } from "@/lib/callout/types";
import { cn } from "@/lib/utils";

export function CalloutPrepare({
  model,
  onCreateDraft,
  className,
}: {
  model: CalloutViewModel["prepare"];
  onCreateDraft?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <ul className="space-y-1.5">
        {model.steps.map((step) => (
          <li
            key={step.id}
            className={cn(
              "flex items-center gap-2 rounded-[12px] px-2.5 py-2 text-[12px] font-medium",
              step.done
                ? "bg-white text-[#191f28] ring-1 ring-black/[0.04]"
                : "bg-[#f2f4f6] text-[#8b95a1]",
            )}
          >
            {step.done ? (
              <Check className="h-3.5 w-3.5 text-[#22c55e]" strokeWidth={2.8} />
            ) : (
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#d1d6db] text-[9px]">
                ○
              </span>
            )}
            {step.labelKo}
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={!model.canCreateDraft}
        className={cn(
          "w-full rounded-full px-3 py-2.5 text-[12px] font-semibold",
          model.canCreateDraft
            ? "bg-[#3182f6] text-white"
            : "cursor-not-allowed bg-[#e8ebef] text-[#c4c9d0]",
        )}
        onClick={() => {
          if (model.canCreateDraft) onCreateDraft?.();
        }}
      >
        {model.ctaKo}
      </button>
      <p className="text-center text-[10px] text-[#8b95a1]">
        AI는 준비만 합니다 · 실행은 사람이 확정합니다
      </p>
    </div>
  );
}
