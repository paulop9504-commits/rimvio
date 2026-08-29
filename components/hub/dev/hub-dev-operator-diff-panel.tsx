"use client";

import type { OperatorDiff } from "@/lib/hub/dev/operator-diff";
import { cn } from "@/lib/utils";

type HubDevOperatorDiffPanelProps = {
  readonly diff: OperatorDiff;
  readonly onApply: () => void;
  readonly onRunTest: () => void;
  readonly onDismiss: () => void;
};

export function HubDevOperatorDiffPanel({
  diff,
  onApply,
  onRunTest,
  onDismiss,
}: HubDevOperatorDiffPanelProps) {
  return (
    <div className="shrink-0 border-b border-white/[0.06] px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-[#f2f4f6]">Proposed fix</p>
          <p className="font-mono text-[10px] text-[#6b7684]">{diff.filePath}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[10px] text-[#6b7684] hover:text-[#b0b8c1]"
        >
          ✕
        </button>
      </div>

      <ul className="mt-2 space-y-0.5 text-[10px] text-[#b0b8c1]">
        {diff.summaryKo.map((line) => (
          <li key={line}>· {line}</li>
        ))}
      </ul>

      <pre className="mt-2 max-h-[160px] overflow-auto rounded-lg border border-white/[0.06] bg-[#0a0c10] p-2 font-mono text-[10px] leading-relaxed">
        {diff.lines.map((line, i) => (
          <div
            key={`${line.kind}-${i}`}
            className={cn(
              line.kind === "add" && "bg-emerald-500/10 text-emerald-300",
              line.kind === "remove" && "bg-red-500/10 text-red-300",
              line.kind === "context" && "text-[#6b7684]",
            )}
          >
            {line.kind === "add" ? "+ " : line.kind === "remove" ? "- " : "  "}
            {line.text}
          </div>
        ))}
      </pre>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onApply}
          className="flex-1 rounded-lg bg-[#4593fc]/15 py-1.5 text-[11px] font-semibold text-[#8ec0ff]"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onRunTest}
          className="flex-1 rounded-lg bg-emerald-500/15 py-1.5 text-[11px] font-semibold text-emerald-400"
        >
          Run Test
        </button>
      </div>
    </div>
  );
}
