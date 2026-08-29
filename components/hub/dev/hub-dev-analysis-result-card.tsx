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
    <section className="rounded-xl border border-white/[0.08] bg-[#151820] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7684]">
          Analysis Result
        </p>
        <span className="text-[10px] text-[#6b7684]">Finished {result.finishedAgoKo}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={cn(
              "rounded-lg border border-white/[0.06] bg-[#0e1014] px-3 py-2.5",
              m.highlight && "border-[#4593fc]/30 bg-[#4593fc]/5",
            )}
          >
            <p
              className={cn(
                "font-mono text-[20px] font-bold tabular-nums",
                m.warn ? "text-amber-400" : m.highlight ? "text-[#8ec0ff]" : "text-[#f2f4f6]",
              )}
            >
              {typeof m.value === "number"
                ? String(m.value).padStart(m.pad, "0")
                : m.value}
            </p>
            <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-[#6b7684]">
              {m.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
