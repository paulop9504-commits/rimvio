"use client";

import type { CalloutViewModel } from "@/lib/callout/types";
import { formatMinutesDelta, formatWonDelta } from "@/lib/callout/simulation";
import { cn } from "@/lib/utils";

export function CalloutSimulation({
  model,
  onPreview,
  onApply,
  className,
}: {
  model: CalloutViewModel["simulate"];
  onPreview?: (alternativeObjectId: string) => void;
  onApply?: (alternativeObjectId: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)} data-callout-mode="simulate">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.04em] text-[#8b95a1]">
          Simulation
        </p>
        <span className="rounded-full bg-[#f2f4f6] px-2 py-0.5 text-[10px] font-semibold text-[#8b95a1]">
          Draft only
        </span>
      </div>

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
          {model.deltas.map((delta) => {
            const impact = delta.result?.impact;
            return (
              <li
                key={delta.id}
                className="rounded-[14px] bg-[#f9fafb] px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-[#8b95a1]">
                      {delta.result?.changes.find((c) => c.kind === "object")
                        ?.labelKo ?? "What-if"}
                    </p>
                    <p className="mt-0.5 text-[12px] font-semibold text-[#191f28]">
                      {delta.alternativeTitle}
                    </p>
                  </div>
                </div>

                {impact ? (
                  <dl className="mt-2.5 space-y-1.5 rounded-[12px] bg-white px-2.5 py-2 ring-1 ring-black/[0.04]">
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <dt className="font-medium text-[#8b95a1]">가격</dt>
                      <dd
                        className={cn(
                          "font-semibold tabular-nums",
                          impact.budget < 0
                            ? "text-[#16a34a]"
                            : impact.budget > 0
                              ? "text-[#b45309]"
                              : "text-[#4e5968]",
                        )}
                      >
                        {formatWonDelta(impact.budget)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <dt className="font-medium text-[#8b95a1]">거리</dt>
                      <dd className="font-semibold tabular-nums text-[#4e5968]">
                        {formatMinutesDelta(impact.distance)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <dt className="font-medium text-[#8b95a1]">일정 영향</dt>
                      <dd className="max-w-[60%] truncate text-right font-semibold tabular-nums text-[#4e5968]">
                        {impact.time === 0
                          ? "변동 없음"
                          : `이동 ${formatMinutesDelta(impact.time)}`}
                      </dd>
                    </div>
                  </dl>
                ) : (
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
                )}

                <div className="mt-2.5 flex gap-1.5">
                  {onPreview ? (
                    <button
                      type="button"
                      className="flex-1 rounded-full bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#191f28] ring-1 ring-black/[0.06]"
                      onClick={() => onPreview(delta.alternativeObjectId)}
                    >
                      What-if 보기
                    </button>
                  ) : null}
                  {onApply ? (
                    <button
                      type="button"
                      className="flex-1 rounded-full bg-[#191f28] px-2.5 py-1.5 text-[11px] font-semibold text-white"
                      onClick={() => onApply(delta.alternativeObjectId)}
                    >
                      Draft에 적용
                    </button>
                  ) : null}
                </div>
                <p className="mt-1.5 text-center text-[10px] text-[#8b95a1]">
                  Reality Commit 하지 않아요
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
