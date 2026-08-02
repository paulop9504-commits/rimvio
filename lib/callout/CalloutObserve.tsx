"use client";

import { CalloutEvidence } from "@/lib/callout/CalloutEvidence";
import type { Evidence } from "@/lib/callout/evidence";
import type { CalloutViewModel } from "@/lib/callout/types";
import { cn } from "@/lib/utils";

export function CalloutObserve({
  model,
  activeEvidenceId,
  onSelectEvidence,
  className,
}: {
  model: CalloutViewModel["observe"];
  activeEvidenceId?: string | null;
  onSelectEvidence?: (evidence: Evidence) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)} data-callout-mode="observe">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.04em] text-[#8b95a1]">
          Observe
        </p>
        <div className="inline-flex items-baseline gap-1 rounded-full bg-[#191f28] px-2.5 py-1 text-white">
          <span className="text-[10px] font-medium text-white/70">AI Score</span>
          <span className="text-[13px] font-bold tabular-nums tracking-[-0.02em]">
            {model.aiScore}
          </span>
        </div>
      </div>

      {model.aiScore > 0 ? (
        <div className="h-1 overflow-hidden rounded-full bg-[#e8ebef]">
          <div
            className="h-full rounded-full bg-[#3182f6] transition-[width] duration-300"
            style={{ width: `${model.aiScore}%` }}
          />
        </div>
      ) : null}

      <CalloutEvidence
        evidence={model.evidence}
        activeId={activeEvidenceId}
        onSelect={onSelectEvidence}
      />
    </div>
  );
}
