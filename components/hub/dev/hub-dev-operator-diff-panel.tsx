"use client";

import type { OperatorDiff } from "@/lib/hub/dev/operator-diff";
import { cn } from "@/lib/utils";

type HubDevOperatorDiffPanelProps = {
  readonly diff: OperatorDiff;
  readonly onApply: () => void;
  readonly onRunTest?: () => void;
  readonly onDismiss?: () => void;
  readonly variant?: "inline" | "compact";
};

export function HubDevOperatorDiffPanel({
  diff,
  onApply,
  onRunTest,
  onDismiss,
  variant = "inline",
}: HubDevOperatorDiffPanelProps) {
  if (variant === "compact") {
    return (
      <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[9px] font-semibold text-[#111827]">Proposed fix</p>
            <p className="font-mono text-[8px] text-[#9ca3af]">{diff.filePath}</p>
          </div>
          {onDismiss ? (
            <button type="button" onClick={onDismiss} className="text-[9px] text-[#9ca3af] hover:text-[#6b7280]">
              ✕
            </button>
          ) : null}
        </div>
        <div className="mt-1.5 flex gap-1.5">
          <button
            type="button"
            onClick={onApply}
            className="flex-1 rounded-md border border-violet-200 bg-white py-1 text-[8px] font-semibold text-violet-700"
          >
            Apply
          </button>
          {onRunTest ? (
            <button
              type="button"
              onClick={onRunTest}
              className="flex-1 rounded-md border border-emerald-200 bg-white py-1 text-[8px] font-semibold text-emerald-700"
            >
              Run Test
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#374151] bg-[#1e1e1e] shadow-md">
      <div className="flex items-center justify-between border-b border-[#374151] bg-[#252526] px-2.5 py-1.5">
        <div>
          <p className="text-[9px] font-semibold text-[#d4d4d4]">Editing code…</p>
          <p className="font-mono text-[8px] text-[#858585]">{diff.filePath}</p>
        </div>
        <button
          type="button"
          onClick={onApply}
          className="rounded-md bg-violet-600 px-2 py-0.5 text-[8px] font-semibold text-white hover:bg-violet-700"
        >
          Apply
        </button>
      </div>
      <pre className="max-h-[120px] overflow-auto p-2 font-mono text-[8px] leading-relaxed">
        {diff.lines.map((line, i) => (
          <div
            key={`${line.kind}-${i}`}
            className={cn(
              line.kind === "add" && "bg-emerald-950/80 text-emerald-400",
              line.kind === "remove" && "bg-red-950/80 text-red-400 line-through",
              line.kind === "context" && "text-[#858585]",
            )}
          >
            {line.kind === "add" ? "+ " : line.kind === "remove" ? "- " : "  "}
            {line.text}
          </div>
        ))}
      </pre>
    </div>
  );
}
