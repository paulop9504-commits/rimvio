"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  buildAgentSimulationPlan,
  runAgentSimulation,
  type AgentSimulationStep,
} from "@/lib/hub/dev/agent-simulation";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type HubDevAgentSimulationProps = {
  draft: PlatformDraft;
  onComplete?: (passed: boolean) => void;
};

export function HubDevAgentSimulation({ draft, onComplete }: HubDevAgentSimulationProps) {
  const [utterance, setUtterance] = useState(
    "오사카 난바역 근처 호텔을 찾아서 예약해줘.",
  );
  const [steps, setSteps] = useState<AgentSimulationStep[] | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = steps?.find((s) => s.id === selectedId) ?? null;

  const handleRun = useCallback(async () => {
    const plan = buildAgentSimulationPlan(draft, utterance);
    setSteps(plan.map((s) => ({ ...s })));
    setRunning(true);
    setSelectedId(null);

    const { passed } = await runAgentSimulation(draft, plan, (id, patch) => {
      setSteps((prev) =>
        prev?.map((s) => (s.id === id ? { ...s, ...patch } : s)) ?? null,
      );
    });

    setRunning(false);
    onComplete?.(passed);
  }, [draft, onComplete, utterance]);

  return (
    <div className="flex h-full min-h-0">
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
        <p className="text-[10px] font-semibold uppercase text-[#64748b]">Agent Simulation</p>
        <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">User Simulation</h2>
        <p className="mt-1 text-[12px] text-[#64748b]">
          Rimvio Agent가 Platform capability를 어떻게 호출하는지 실행 trace를 확인합니다.
          <span className="ml-1 text-amber-700">Sandbox · Platform Host stub</span>
        </p>

        <textarea
          value={utterance}
          onChange={(e) => setUtterance(e.target.value)}
          rows={3}
          className="mt-4 w-full max-w-2xl rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[13px]"
        />

        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={running || draft.actions.length === 0}
          className="mt-3 flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
        >
          {running ? <Loader2 className="size-4 animate-spin" /> : null}
          Run Agent Simulation
        </button>

        {steps ? (
          <ol className="mt-8 max-w-2xl space-y-2">
            {steps.map((step, i) => (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(step.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[12px]",
                    selectedId === step.id
                      ? "border-[#6366F1] bg-white shadow-sm"
                      : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]",
                  )}
                >
                  <span className="text-[#94A3B8]">{i + 1}</span>
                  <span className="min-w-0 flex-1 font-medium text-[#334155]">{step.label}</span>
                  <StepBadge status={step.status} />
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-8 text-[12px] text-[#94A3B8]">
            Platform에 capability가 있어야 simulation을 실행할 수 있습니다.
          </p>
        )}
      </div>

      <aside className="w-[300px] shrink-0 border-l border-[#E2E8F0] bg-white p-4">
        <p className="text-[11px] font-semibold text-[#334155]">Step Inspector</p>
        {selected ? (
          <dl className="mt-3 space-y-3 text-[11px]">
            <div>
              <dt className="text-[#94A3B8]">Kind</dt>
              <dd className="text-[#334155]">{selected.kind}</dd>
            </div>
            {selected.detail ? (
              <div>
                <dt className="text-[#94A3B8]">Detail</dt>
                <dd className="text-[#334155]">{selected.detail}</dd>
              </div>
            ) : null}
            {selected.input ? (
              <div>
                <dt className="text-[#94A3B8]">Input</dt>
                <dd className="font-mono text-[10px] text-[#475569]">
                  {JSON.stringify(selected.input, null, 2)}
                </dd>
              </div>
            ) : null}
            {selected.output ? (
              <div>
                <dt className="text-[#94A3B8]">Output</dt>
                <dd className="font-mono text-[10px] text-[#475569]">
                  {JSON.stringify(selected.output, null, 2)}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-3 text-[11px] text-[#94A3B8]">단계를 클릭하면 Input / Output을 확인합니다.</p>
        )}
      </aside>
    </div>
  );
}

function StepBadge({ status }: { status: AgentSimulationStep["status"] }) {
  const label =
    status === "success"
      ? "✓"
      : status === "running"
        ? "…"
        : status === "failed"
          ? "✗"
          : "○";
  const className =
    status === "success"
      ? "text-emerald-600"
      : status === "running"
        ? "text-[#6366F1]"
        : status === "failed"
          ? "text-red-600"
          : "text-[#CBD5E1]";

  return <span className={cn("font-bold", className)}>{label}</span>;
}
