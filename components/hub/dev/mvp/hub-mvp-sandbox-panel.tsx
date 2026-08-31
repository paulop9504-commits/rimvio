"use client";

import { MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, TrafficLights } from "@/components/dev/rimvio-dev-agent/dev-agent-primitives";
import type { HubMvpRuntime } from "@/lib/hub/dev/mvp/use-hub-mvp-runtime";
import { getMvpCapabilityById } from "@/lib/hub/dev/mvp/use-hub-mvp-runtime";
import { HubMvpLoopView } from "@/components/hub/dev/mvp/hub-mvp-loop-view";
import { HubMvpPublishCard } from "@/components/hub/dev/mvp/hub-mvp-publish-card";

const WORKFLOW_STEPS = [
  { id: "understand", label: "UNDERSTAND" },
  { id: "plan", label: "PLAN" },
  { id: "build", label: "BUILD" },
  { id: "run", label: "RUN" },
  { id: "verify", label: "VERIFY" },
  { id: "ready", label: "READY" },
] as const;

function formatKrw(value: number): string {
  return `₩${value.toLocaleString("ko-KR")}`;
}

function CoupangSandbox({ runtime }: { runtime: HubMvpRuntime }) {
  const best =
    runtime.sandboxProducts.length > 0
      ? [...runtime.sandboxProducts].sort((a, b) => a.priceKrw - b.priceKrw)[0]
      : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        className="flex items-center gap-3 border-b px-4 py-2.5"
        style={{ borderColor: "rgba(0,0,0,0.06)" }}
      >
        <TrafficLights />
        <div className="flex min-w-0 flex-1 items-center rounded-lg border bg-[#f5f5f7] px-3 py-1.5 text-[12px] text-[#636366]">
          coupang.com/search?q={runtime.sandboxQuery || "…"}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-md bg-[#e31837] px-2 py-1 text-[11px] font-bold text-white">coupang</span>
          <div className="flex flex-1 items-center rounded-lg border px-3 py-2 text-[13px]">
            {runtime.sandboxQuery || "검색어를 입력하세요"}
            {runtime.sandboxPhase === "searching" || runtime.sandboxPhase === "reading" ? (
              <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-[#6b4cff]" />
            ) : null}
          </div>
        </div>

        {runtime.sandboxProducts.length > 0 ? (
          <div className="space-y-2">
            {runtime.sandboxProducts.map((product, index) => (
              <div
                key={product.id}
                className={cn(
                  "flex items-center justify-between rounded-[12px] border px-4 py-3 transition-all",
                  best?.id === product.id && runtime.sandboxPhase === "done"
                    ? "border-[#34c759] bg-[#f3fbf6]"
                    : "border-[rgba(0,0,0,0.06)]",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                    style={{ background: `hsl(${200 + index * 30}, 55%, 48%)` }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium">{product.name}</p>
                    {best?.id === product.id && runtime.sandboxPhase === "done" ? (
                      <p className="text-[11px] text-[#248a3d]">최저가</p>
                    ) : null}
                  </div>
                </div>
                <p className="text-[14px] font-semibold">{formatKrw(product.priceKrw)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center text-[13px] text-[#aeaeb2]">
            {runtime.sandboxPhase === "idle"
              ? "Sandbox에서 실행을 기다리는 중"
              : "사이트를 분석하고 있습니다…"}
          </div>
        )}

        {runtime.agentCursor.visible ? (
          <div
            className="pointer-events-none absolute z-10 flex items-center gap-1 rounded-full bg-[#6b4cff] px-2 py-1 text-[10px] font-semibold text-white shadow-lg transition-all duration-500"
            style={{
              left: `${runtime.agentCursor.x}%`,
              top: `${runtime.agentCursor.y}%`,
            }}
          >
            <MousePointer2 className="h-3 w-3" />
            Agent
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CapabilityDetail({
  capabilityId,
  runtime,
}: {
  capabilityId: string;
  runtime: HubMvpRuntime;
}) {
  const cap = getMvpCapabilityById(runtime, capabilityId);
  if (!cap) return null;

  return (
    <Panel className="m-6 p-6">
      <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{cap.name}</h2>
      <p className="mt-1 text-[13px] text-[#86868b]">{cap.description}</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">Input</p>
          {cap.inputSchema.map((row) => (
            <div key={row.name} className="mt-2 flex justify-between rounded-[10px] border px-3 py-2 text-[12px]">
              <span>{row.name}</span>
              <span className="text-[#86868b]">{row.type}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">Output</p>
          {cap.outputSchema.map((row) => (
            <div key={row.name} className="mt-2 flex justify-between rounded-[10px] border px-3 py-2 text-[12px]">
              <span>{row.name}</span>
              <span className="text-[#86868b]">{row.type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => runtime.testCapability(cap.id)}
          className="rounded-[10px] border px-4 py-2 text-[12px] font-semibold"
        >
          Test
        </button>
        {cap.status !== "published" ? (
          <button
            type="button"
            onClick={() => runtime.publishCapability(cap.id)}
            className="rounded-[10px] bg-[#6b4cff] px-4 py-2 text-[12px] font-semibold text-white"
          >
            Publish
          </button>
        ) : null}
      </div>
    </Panel>
  );
}

export function HubMvpSandboxPanel({ runtime }: { runtime: HubMvpRuntime }) {
  const stageIndex = WORKFLOW_STEPS.findIndex((s) => s.id === runtime.workflowStage);

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-[#f5f5f7]">
      <div className="border-b bg-white px-5 py-3" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#86868b]">Live Sandbox</p>
        {runtime.isRunning || runtime.workflowStage !== "idle" ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {WORKFLOW_STEPS.map((step, index) => {
              const done = stageIndex > index || runtime.workflowStage === "ready";
              const active = runtime.workflowStage === step.id;
              return (
                <div key={step.id} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.06em]",
                      done && "bg-[#e8f8ee] text-[#248a3d]",
                      active && !done && "bg-[#f0edff] text-[#6b4cff]",
                      !done && !active && "bg-[#f2f2f7] text-[#aeaeb2]",
                    )}
                  >
                    {done ? "✓ " : ""}
                    {step.label}
                  </span>
                  {index < WORKFLOW_STEPS.length - 1 ? (
                    <span className="text-[#c7c7cc]">↓</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {runtime.centerView === "ready" && runtime.readyCapability ? (
            <HubMvpPublishCard runtime={runtime} capability={runtime.readyCapability} />
          ) : runtime.centerView === "loop" && runtime.selectedLoopId ? (
            <HubMvpLoopView runtime={runtime} loopId={runtime.selectedLoopId} />
          ) : runtime.centerView === "capability" && runtime.selectedCapabilityId ? (
            <CapabilityDetail capabilityId={runtime.selectedCapabilityId} runtime={runtime} />
          ) : (
            <CoupangSandbox runtime={runtime} />
          )}
        </Panel>

        {runtime.activityLines.length > 0 ? (
          <Panel className="mt-3 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">Activity</p>
            <ul className="mt-2 space-y-1">
              {runtime.activityLines.map((line) => (
                <li key={line.id} className="text-[12px] text-[#3a3a3c]">
                  {line.done ? "✓ " : "→ "}
                  {line.text}
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>
    </main>
  );
}
