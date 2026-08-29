"use client";

import type { OperatorDiff } from "@/lib/hub/dev/operator-diff";
import { cn } from "@/lib/utils";

type HubDevOperatorDiffPanelProps = {
  readonly diff: OperatorDiff;
  readonly onApply: () => void;
  readonly onRunTest: () => void;
  readonly onDismiss: () => void;
};

export function HubDevOperatorDiffPanel({ diff, onApply, onRunTest, onDismiss }: HubDevOperatorDiffPanelProps) {
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] font-semibold text-[#111827]">Proposed fix</p>
          <p className="font-mono text-[8px] text-[#9ca3af]">{diff.filePath}</p>
        </div>
        <button type="button" onClick={onDismiss} className="text-[9px] text-[#9ca3af] hover:text-[#6b7280]">
          ✕
        </button>
      </div>
      <ul className="mt-1 space-y-0.5 text-[8px] text-[#6b7280]">
        {diff.summaryKo.map((line) => (
          <li key={line}>· {line}</li>
        ))}
      </ul>
      <pre className="mt-1.5 max-h-[80px] overflow-auto rounded-md border border-[#e5e7eb] bg-white p-1.5 font-mono text-[8px] leading-relaxed">
        {diff.lines.map((line, i) => (
          <div
            key={`${line.kind}-${i}`}
            className={cn(
              line.kind === "add" && "bg-emerald-50 text-emerald-800",
              line.kind === "remove" && "bg-red-50 text-red-700 line-through",
              line.kind === "context" && "text-[#9ca3af]",
            )}
          >
            {line.kind === "add" ? "+ " : line.kind === "remove" ? "- " : "  "}
            {line.text}
          </div>
        ))}
      </pre>
      <div className="mt-1.5 flex gap-1.5">
        <button
          type="button"
          onClick={onApply}
          className="flex-1 rounded-md border border-violet-200 bg-white py-1 text-[8px] font-semibold text-violet-700"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onRunTest}
          className="flex-1 rounded-md border border-emerald-200 bg-white py-1 text-[8px] font-semibold text-emerald-700"
        >
          Run Test
        </button>
      </div>
    </div>
  );
}
