"use client";

import type { CalloutViewModel } from "@/lib/callout/types";
import { cn } from "@/lib/utils";

export function CalloutSimulation({
  model,
  onApply,
  className,
}: {
  model: CalloutViewModel["simulate"];
  onApply?: (alternativeObjectId: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="rounded-[14px] bg-white px-3 py-2.5 ring-1 ring-black/[0.04]">
        <p className="text-[10px] font-semibold text-[#8b95a1]">현재 선택</p>
        <p className="mt-0.5 text-[13px] font-semibold text-[#191f28]">
          {model.currentTitle}
        </p>
      </div>

      {model.deltas.length === 0 ? (
        <p className="text-[12px] leading-snug text-[#8b95a1]">{model.emptyKo}</p>
      ) : (
        <ul className="space-y-2">
          {model.deltas.map((delta) => (
            <li
              key={delta.id}
              className="rounded-[14px] bg-[#f9fafb] px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-semibold text-[#191f28]">
                  {delta.alternativeTitle}
                </p>
                {onApply ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-full bg-[#191f28] px-2.5 py-1 text-[10px] font-semibold text-white"
                    onClick={() => onApply(delta.alternativeObjectId)}
                  >
                    적용 시험
                  </button>
                ) : null}
              </div>
              <ul className="mt-1.5 space-y-1">
                {delta.linesKo.map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-2 text-[12px] text-[#4e5968]"
                  >
                    <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-[#3182f6]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              {(delta.budgetDeltaKo || delta.routeDeltaKo) && (
                <p className="mt-2 text-[11px] font-medium text-[#3182f6]">
                  {[delta.budgetDeltaKo, delta.routeDeltaKo]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
