"use client";

import { cn } from "@/lib/utils";
import type { LoopDefinition, LoopTestResult } from "@/lib/agent-os/loop-builder/types";

type LoopTestPanelProps = {
  readonly loop: LoopDefinition;
  readonly test: LoopTestResult | null;
  readonly testing: boolean;
  readonly onRunAgain: () => void;
  readonly onSelectNode: (nodeId: string) => void;
  readonly selectedTraceNodeId?: string | null;
};

export function LoopTestPanel(props: LoopTestPanelProps) {
  if (!props.test && !props.testing) return null;

  const durationSec =
    props.test && props.test.traces.length >= 2
      ? (
          (new Date(props.test.traces[props.test.traces.length - 1]!.atIso).getTime() -
            new Date(props.test.traces[0]!.atIso).getTime()) /
          1000
        ).toFixed(1)
      : null;

  const passedCount = props.test?.steps.filter((s) => s.ok).length ?? 0;
  const failedCount = props.test?.steps.filter((s) => !s.ok).length ?? 0;

  return (
    <div className="border-t border-[#e5e7eb] bg-white">
      <div className="flex items-center justify-between border-b border-[#f3f4f6] px-3 py-1.5">
        <div className="flex items-center gap-3 text-[10px]">
          <span className="font-semibold text-[#374151]">Run Test</span>
          <span className="text-[#9ca3af]">Execution Log</span>
          <span className="text-[#9ca3af]">Variables</span>
          <span className="text-[#9ca3af]">Events</span>
          <span className="text-[#9ca3af]">AI Audit</span>
        </div>
        {props.test ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-bold",
              props.test.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
            )}
          >
            {props.test.passed ? "SUCCESS" : "FAILED"}
            {durationSec ? ` · ${durationSec}s` : ""}
          </span>
        ) : null}
      </div>

      <div className="grid max-h-40 grid-cols-3 gap-3 px-3 py-2">
        <div>
          <p className="text-[9px] font-semibold text-[#6b7280]">Scenario</p>
          <p className="mt-0.5 text-[10px] text-[#374151]">{props.loop.description || props.loop.name}</p>
          <button
            type="button"
            onClick={props.onRunAgain}
            disabled={props.testing}
            className="mt-2 rounded-md border border-[#e5e7eb] px-2 py-0.5 text-[9px] font-semibold text-[#374151] hover:bg-[#f9fafb]"
          >
            Run Again
          </button>
        </div>

        <div className="overflow-y-auto">
          <p className="text-[9px] font-semibold text-[#6b7280]">Timeline</p>
          <ul className="mt-1 space-y-0.5">
            {(props.test?.traces ?? []).map((t) => (
              <li key={t.nodeId + t.atIso}>
                <button
                  type="button"
                  onClick={() => props.onSelectNode(t.nodeId)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-[9px]",
                    props.selectedTraceNodeId === t.nodeId ? "bg-violet-50 text-violet-800" : "text-[#374151]",
                  )}
                >
                  <span>
                    {t.status === "pass" ? "✓" : t.status === "fail" ? "✗" : "○"}
                  </span>
                  <span className="truncate">{t.label}</span>
                  <span className="ml-auto font-mono text-[8px] text-[#9ca3af]">{t.atIso.slice(11, 19)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[9px] font-semibold text-[#6b7280]">Result</p>
          {props.test ? (
            <div className="mt-1 space-y-0.5 text-[9px] text-[#374151]">
              <p>
                {props.test.steps.length} steps · {passedCount} pass · {failedCount} fail
              </p>
              {props.test.reasonKo ? <p className="text-red-600">{props.test.reasonKo}</p> : null}
            </div>
          ) : (
            <p className="mt-1 text-[9px] text-[#9ca3af]">Running…</p>
          )}
        </div>
      </div>
    </div>
  );
}
