"use client";

import { cn } from "@/lib/utils";
import type { DiffLine } from "@/lib/hub/dev/capability-patch";

type HubDevDiffPanelProps = {
  diff: readonly DiffLine[];
  title?: string;
};

export function HubDevDiffPanel({ diff, title = "Proposed changes" }: HubDevDiffPanelProps) {
  if (diff.length === 0) {
    return (
      <p className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-[12px] text-[#64748b]">
        No changes detected.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#0F172A]">
      <p className="border-b border-white/10 px-3 py-2 text-[11px] font-semibold text-[#94a3b8]">
        {title}
      </p>
      <pre className="max-h-64 overflow-auto p-3 font-mono text-[11px] leading-relaxed">
        {diff.map((line, i) => (
          <div
            key={`${i}-${line.type}`}
            className={cn(
              line.type === "add" && "bg-emerald-500/15 text-emerald-300",
              line.type === "remove" && "bg-red-500/15 text-red-300",
              line.type === "same" && "text-slate-500",
            )}
          >
            <span className="mr-2 inline-block w-4 select-none opacity-60">
              {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
            </span>
            {line.line}
          </div>
        ))}
      </pre>
    </div>
  );
}
