"use client";

import { calloutModeLabelKo } from "@/lib/callout/build-callout-model";
import type { CalloutMode } from "@/lib/callout/types";
import { cn } from "@/lib/utils";

export function CalloutTabs({
  modes,
  active,
  onChange,
  className,
}: {
  modes: readonly CalloutMode[];
  active: CalloutMode;
  onChange: (mode: CalloutMode) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto rounded-[14px] bg-[#f2f4f6] p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
      aria-label="Object Callout modes"
    >
      {modes.map((mode) => {
        const on = mode === active;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={on}
            className={cn(
              "shrink-0 rounded-[10px] px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
              on
                ? "bg-white text-[#191f28] shadow-[0_1px_4px_rgba(25,31,40,0.08)]"
                : "text-[#8b95a1]",
            )}
            onClick={() => onChange(mode)}
          >
            {calloutModeLabelKo(mode)}
          </button>
        );
      })}
    </div>
  );
}
