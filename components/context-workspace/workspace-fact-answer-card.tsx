"use client";

import { MapPin } from "lucide-react";
import { projectFactAnswerToGlobe } from "@/lib/fact-query/dispatch-fact-query-turn";
import type { FactAnswerWire } from "@/lib/fact-query/types";
import { cn } from "@/lib/utils";

type WorkspaceFactAnswerCardProps = {
  wire: FactAnswerWire;
  className?: string;
  onProjectGlobe?: () => void;
};

export function WorkspaceFactAnswerCard({
  wire,
  className,
  onProjectGlobe,
}: WorkspaceFactAnswerCardProps) {
  const project = () => {
    projectFactAnswerToGlobe(wire);
    onProjectGlobe?.();
  };

  return (
    <div
      className={cn("space-y-2 rounded-[16px] bg-white px-2.5 py-2 ring-1 ring-black/[0.05]", className)}
      data-workspace-fact-answer={wire.kind}
    >
      <p className="text-[12px] leading-relaxed text-[#4e5968]">{wire.summaryKo}</p>

      {wire.evidence.length > 0 ? (
        <div className="space-y-1.5">
          {wire.evidence.slice(0, 5).map((row, index) => (
            <div
              key={row.id}
              className={cn(
                "rounded-xl px-2.5 py-2",
                wire.highlightId === row.id
                  ? "bg-[#e8f3ff] ring-1 ring-[#3182f6]/25"
                  : "bg-[#f7f8fa]",
              )}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-[10px] font-bold text-[#3182f6]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-[#191f28]">{row.labelKo}</p>
                  {row.detailKo ? (
                    <p className="mt-0.5 text-[11px] leading-snug text-[#8b95a1]">
                      {row.detailKo}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <p className="text-[10px] text-[#8b95a1]">출처: {wire.sourceKo}</p>

      {wire.evidence.length > 0 ? (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-[#3182f6] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-90"
          onClick={project}
        >
          <MapPin className="size-3.5" />
          지도에서 보기
        </button>
      ) : null}
    </div>
  );
}
