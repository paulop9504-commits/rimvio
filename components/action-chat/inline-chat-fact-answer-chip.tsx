"use client";

import { MapPin } from "lucide-react";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { projectFactAnswerToGlobe } from "@/lib/fact-query/dispatch-fact-query-turn";
import type { FactAnswerWire } from "@/lib/fact-query/types";
import { resolveMainActionBrandStyle } from "@/lib/brand/action-brand-style";
import { cn } from "@/lib/utils";

type InlineChatFactAnswerChipProps = {
  wire: FactAnswerWire;
  className?: string;
  onProjectGlobe?: () => void;
};

export function InlineChatFactAnswerChip({
  wire,
  className,
  onProjectGlobe,
}: InlineChatFactAnswerChipProps) {
  const brand = resolveMainActionBrandStyle({
    label: "지도에서 보기",
    deeplink: "",
  });

  const project = () => {
    projectFactAnswerToGlobe(wire);
    onProjectGlobe?.();
  };

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-[13px] leading-relaxed text-white/75">{wire.summaryKo}</p>

      {wire.evidence.length > 0 ? (
        <div className="space-y-2">
          {wire.evidence.slice(0, 5).map((row, index) => (
            <div
              key={row.id}
              className={cn(
                "rounded-xl border px-3 py-2.5",
                wire.highlightId === row.id
                  ? "border-cyan-400/35 bg-cyan-400/8"
                  : "border-white/10 bg-white/[0.04]",
              )}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-[11px] font-semibold text-cyan-300/90">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{row.labelKo}</p>
                  {row.detailKo ? (
                    <p className="mt-0.5 text-[12px] leading-relaxed text-white/55">
                      {row.detailKo}
                    </p>
                  ) : null}
                </div>
                {row.score != null ? (
                  <span className="shrink-0 text-[11px] text-white/45">{row.score}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <p className="text-[11px] text-white/40">출처: {wire.sourceKo}</p>

      {wire.evidence.length > 0 ? (
        <MainActionButton
          label="지도에서 보기"
          brand={brand}
          compact
          icon={<MapPin className="size-4" />}
          onClick={project}
        />
      ) : null}
    </div>
  );
}
