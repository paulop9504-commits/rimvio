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
    <div className="border-t border-[#f3f4f6] px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-[#111827]">Proposed fix</p>
          <p className="font-mono text-[10px] text-[#9ca3af]">{diff.filePath}</p>
        </div>
        <button type="button" onClick={onDismiss} className="text-[10px] text-[#9ca3af]">✕</button>
      </div>
      <ul className="mt-2 space-y-0.5 text-[10px] text-[#6b7280]">
        {diff.summaryKo.map((line) => (
          <li key={line}>· {line}</li>
        ))}
      </ul>
      <pre className="mt-2 max-h-[120px] overflow-auto rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-2 font-mono text-[10px] leading-relaxed">
        {diff.lines.map((line, i) => (
          <div key={`${line.kind}-${i}`} className={cn(line.kind === "add" && "bg-emerald-50 text-emerald-800", line.kind === "remove" && "bg-red-50 text-red-700 line-through", line.kind === "context" && "text-[#9ca3af]")}>
            {line.kind === "add" ? "+ " : line.kind === "remove" ? "- " : "  "}{line.text}
          </div>
        ))}
      </pre>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onApply} className="flex-1 rounded-lg bg-violet-100 py-1.5 text-[11px] font-semibold text-violet-700">Apply</button>
        <button type="button" onClick={onRunTest} className="flex-1 rounded-lg bg-emerald-50 py-1.5 text-[11px] font-semibold text-emerald-700">Run Test</button>
      </div>
    </div>
  );
}
