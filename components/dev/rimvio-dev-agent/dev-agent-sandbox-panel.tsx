"use client";

import {
  ChevronDown,
  ExternalLink,
  MonitorSmartphone,
  MousePointer2,
  RefreshCw,
  ScanSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCapabilityById, type DevAgentRuntime } from "@/lib/dev/rimvio-dev-agent/use-dev-agent-runtime";
import { Panel } from "./dev-agent-primitives";
import { OsakaStaySandbox } from "./osakastay-sandbox";

const FLOW_STEPS = ["request", "intent", "capability", "runtime", "result"] as const;

function FlowNode({
  label,
  value,
  active,
  done,
}: {
  label: string;
  value: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="min-w-[120px] flex-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">{label}</p>
      <div
        className={cn(
          "mt-1 rounded-[12px] border px-3 py-2 text-[12px] font-medium transition-all",
          active && "border-[#6b4cff] bg-[#f7f5ff] shadow-[0_0_0_3px_rgba(107,76,255,0.12)]",
          done && !active && "border-[#d7f0df] bg-[#f3fbf6]",
          !active && !done && "border-[rgba(0,0,0,0.06)] bg-white",
        )}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function CapabilityDetail({ capabilityId, onTest }: { capabilityId: string; onTest: () => void }) {
  const cap = getCapabilityById(capabilityId);
  if (!cap) {
    return null;
  }
  return (
    <Panel className="mx-4 mt-4 p-5">
      <h2 className="text-[20px] font-semibold tracking-[-0.02em]">{cap.label}</h2>
      <p className="mt-1 text-[13px] text-[#86868b]">{cap.description}</p>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">Inputs</p>
          <div className="mt-2 space-y-1.5">
            {cap.inputs.map((input) => (
              <div
                key={input.name}
                className="flex items-center justify-between rounded-[10px] border px-3 py-2 text-[12px]"
                style={{ borderColor: "rgba(0,0,0,0.06)" }}
              >
                <span className="font-medium">{input.name}</span>
                <span className="text-[#86868b]">{input.type}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">Runtime</p>
            <p className="mt-1 text-[13px]">{cap.runtime}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">Permission</p>
            <p className="mt-1 text-[13px]">{cap.permission === "approval" ? "Approval" : "Auto"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">Used by</p>
            <p className="mt-1 text-[13px]">{cap.usedBy.join(" · ")}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onTest}
        className="mt-5 rounded-[10px] bg-[#6b4cff] px-4 py-2 text-[13px] font-semibold text-white"
      >
        Test Capability
      </button>
    </Panel>
  );
}

function MetricCard({ label, value, spark }: { label: string; value: string; spark: number[] }) {
  const max = Math.max(...spark, 1);
  return (
    <div className="rounded-[12px] border bg-white px-3 py-2.5" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
      <p className="text-[10px] font-medium text-[#86868b]">{label}</p>
      <p className="mt-1 text-[18px] font-semibold tracking-[-0.02em]">{value}</p>
      <div className="mt-2 flex h-6 items-end gap-0.5">
        {spark.map((v, i) => (
          <span
            key={`${label}-${i}`}
            className="w-1.5 rounded-sm bg-[#6b4cff]/35"
            style={{ height: `${Math.max(18, (v / max) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function DevAgentSandboxPanel({ runtime }: { runtime: DevAgentRuntime }) {
  const stageIndex = FLOW_STEPS.indexOf(runtime.flowStage);

  return (
    <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div className="flex gap-1">
          {(["sandbox", "logs", "metrics"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => runtime.setSandboxTab(tab)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-medium capitalize",
                runtime.sandboxTab === tab
                  ? "bg-white text-[#1d1d1f] shadow-sm"
                  : "text-[#86868b] hover:text-[#1d1d1f]",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
          <span className="flex items-center gap-1.5 text-[#248a3d]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#34c759]" />
            Live Simulation
          </span>
          <span>Environment: Sandbox</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {runtime.sandboxTab === "sandbox" ? (
          <>
            <p className="mb-3 text-[13px] text-[#636366]">
              Agent가 실제로 Capability를 실행 중입니다.
            </p>

            <div className="mb-4 flex items-stretch gap-2 overflow-x-auto">
              <FlowNode
                label="User Request"
                value={runtime.userRequest || "—"}
                active={runtime.flowStage === "request"}
                done={stageIndex > 0}
              />
              <span className="self-center text-[#c7c7cc]">→</span>
              <FlowNode
                label="Intent"
                value={runtime.intent || "—"}
                active={runtime.flowStage === "intent"}
                done={stageIndex > 1}
              />
              <span className="self-center text-[#c7c7cc]">→</span>
              <FlowNode
                label="Capability"
                value={runtime.activeCapabilityId ?? "—"}
                active={runtime.flowStage === "capability"}
                done={stageIndex > 2}
              />
              <span className="self-center text-[#c7c7cc]">→</span>
              <FlowNode
                label="Runtime"
                value={runtime.flowStage === "runtime" || stageIndex > 3 ? "Cloud Agent" : "—"}
                active={runtime.flowStage === "runtime"}
                done={stageIndex > 3}
              />
              <span className="self-center text-[#c7c7cc]">→</span>
              <FlowNode
                label="Result"
                value={runtime.resultText || "—"}
                active={runtime.flowStage === "result"}
                done={runtime.flowStatus === "completed"}
              />
            </div>

            {runtime.centerMode.kind === "capability" ? (
              <CapabilityDetail
                capabilityId={runtime.centerMode.capabilityId}
                onTest={() => {
                  const id = runtime.centerMode.kind === "capability" ? runtime.centerMode.capabilityId : "hotel.search";
                  runtime.testCapability(id);
                }}
              />
            ) : (
              <Panel className="overflow-hidden">
                <div className="flex items-center gap-2 border-b bg-[#fbfbfd] px-3 py-2 text-[#86868b]" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                  <button type="button" className="rounded-md p-1 hover:bg-black/[0.04]">
                    ←
                  </button>
                  <button type="button" className="rounded-md p-1 hover:bg-black/[0.04]">
                    →
                  </button>
                  <button type="button" className="rounded-md p-1 hover:bg-black/[0.04]">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <div className="mx-1 flex flex-1 items-center rounded-[10px] border bg-white px-3 py-1.5 text-[12px] text-[#636366]" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                    https://sandbox.rimvio.app/osakastay
                  </div>
                  <button type="button" className="rounded-md p-1 hover:bg-black/[0.04]">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="rounded-md p-1 hover:bg-black/[0.04]">
                    <ScanSearch className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="rounded-md p-1 hover:bg-black/[0.04]">
                    <MonitorSmartphone className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="rounded-md p-1 hover:bg-black/[0.04]">
                    <MousePointer2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <OsakaStaySandbox runtime={runtime} />
              </Panel>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard label="Response Time" value={`${runtime.metrics.responseMs || 0}s`} spark={[2, 3, 2, 4, 3, 5, 4]} />
              <MetricCard label="API Calls" value={String(runtime.metrics.apiCalls)} spark={[1, 2, 1, 3, 2, 3, 3]} />
              <MetricCard label="Success Rate" value={`${runtime.metrics.successRate}%`} spark={[5, 5, 5, 5, 5, 5, 5]} />
              <MetricCard label="Tokens Used" value={runtime.metrics.tokens.toLocaleString()} spark={[2, 4, 3, 5, 4, 6, 5]} />
            </div>

            <Panel className="mt-4 overflow-hidden">
              <div className="flex border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                {(["console", "network", "events"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => runtime.setConsoleTab(tab)}
                    className={cn(
                      "px-4 py-2 text-[12px] font-medium capitalize",
                      runtime.consoleTab === tab
                        ? "border-b-2 border-[#6b4cff] text-[#1d1d1f]"
                        : "text-[#86868b]",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="max-h-[160px] overflow-y-auto bg-[#111113] px-4 py-3 font-mono text-[11px] leading-5 text-[#d1d1d6]">
                {runtime.consoleTab === "console"
                  ? runtime.consoleLines.map((line) => (
                      <p
                        key={line.id}
                        className={cn(
                          line.tone === "success" && "text-[#34c759]",
                          line.tone === "warn" && "text-[#ff9f0a]",
                          line.tone === "error" && "text-[#ff453a]",
                        )}
                      >
                        {line.time} {line.text}
                      </p>
                    ))
                  : null}
                {runtime.consoleTab === "network"
                  ? runtime.networkLines.map((line) => (
                      <p key={line.id}>
                        {line.method.padEnd(5)} {line.path} {line.status} {line.ms}ms
                      </p>
                    ))
                  : null}
                {runtime.consoleTab === "events"
                  ? runtime.eventLines.map((line) => <p key={line.id}>{line.name}</p>)
                  : null}
                {runtime.consoleTab === "console" && runtime.consoleLines.length === 0 ? (
                  <p className="text-[#636366]">실행 로그가 여기에 표시됩니다.</p>
                ) : null}
              </div>
            </Panel>
          </>
        ) : runtime.sandboxTab === "logs" ? (
          <Panel className="p-4 font-mono text-[12px] text-[#636366]">Full execution logs…</Panel>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <MetricCard label="Response Time" value={`${runtime.metrics.responseMs || 0}s`} spark={[2, 3, 2, 4, 3, 5, 4]} />
            <MetricCard label="API Calls" value={String(runtime.metrics.apiCalls)} spark={[1, 2, 1, 3, 2, 3, 3]} />
            <MetricCard label="Success Rate" value={`${runtime.metrics.successRate}%`} spark={[5, 5, 5, 5, 5, 5, 5]} />
            <MetricCard label="Tokens Used" value={runtime.metrics.tokens.toLocaleString()} spark={[2, 4, 3, 5, 4, 6, 5]} />
          </div>
        )}
      </div>

      {runtime.approvalOpen ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 p-6">
          <Panel className="w-full max-w-md p-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#ff9500]">
              Approval required
            </p>
            <p className="mt-2 text-[15px] font-medium">{runtime.approvalLabel}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={runtime.rejectPending}
                className="rounded-[10px] border px-4 py-2 text-[13px] font-medium"
                style={{ borderColor: "rgba(0,0,0,0.08)" }}
              >
                Reject
              </button>
              <button
                type="button"
                onClick={runtime.approvePending}
                className="rounded-[10px] bg-[#6b4cff] px-4 py-2 text-[13px] font-semibold text-white"
              >
                Approve
              </button>
            </div>
          </Panel>
        </div>
      ) : null}
    </main>
  );
}
