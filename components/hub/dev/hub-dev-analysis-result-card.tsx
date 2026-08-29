"use client";

import type { DevAnalysisResult } from "@/lib/hub/dev/dev-analysis-result";
import { cn } from "@/lib/utils";

type HubDevAnalysisResultCardProps = {
  readonly result: DevAnalysisResult;
};

export function HubDevAnalysisResultCard({ result }: HubDevAnalysisResultCardProps) {
  const metrics: Array<{
    label: string;
    value: number | string;
    pad: number;
    warn?: boolean;
    highlight?: boolean;
  }> = [
    { label: "Capabilities Discovered", value: result.capabilitiesDiscovered, pad: 2 },
    { label: "Schemas Generated", value: result.schemasGenerated, pad: 2 },
    { label: "Issues Found", value: result.issuesFound, pad: 2, warn: result.issuesFound > 0 },
    { label: "Tests Passed", value: result.testsPassed, pad: 2 },
    {
      label: "Confidence Score",
      value: `${result.confidenceScore}%`,
      pad: 0,
      highlight: true,
    },
  ];

  return (
    <section className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">
          Analysis Result
        </p>
        <span className="text-[10px] text-[#9ca3af]">Finished {result.finishedAgoKo}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={cn(
              "rounded-xl border border-[#f3f4f6] bg-[#fafafa] px-3 py-2.5",
              m.highlight && "border-violet-200 bg-violet-50",
            )}
          >
            <p
              className={cn(
                "font-mono text-[20px] font-bold tabular-nums",
                m.warn ? "text-amber-600" : m.highlight ? "text-violet-700" : "text-[#111827]",
              )}
            >
              {typeof m.value === "number"
                ? String(m.value).padStart(m.pad, "0")
                : m.value}
            </p>
            <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-[#9ca3af]">
              {m.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
