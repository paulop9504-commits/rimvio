"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Database,
  FileCode2,
  GitBranch,
  Layers3,
  ListTree,
  Plus,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEV_AGENT_LOOPS, DEV_AGENT_SOURCES } from "@/lib/dev/rimvio-dev-agent/fixtures";
import type { DevAgentRuntime } from "@/lib/dev/rimvio-dev-agent/use-dev-agent-runtime";
import {
  getExplorerCapabilityMeta,
  useExplorerCapabilities,
} from "@/lib/dev/rimvio-dev-agent/use-explorer-capabilities";
import { Badge } from "./dev-agent-primitives";
import { ExplorerTabs, ExplorerToolbar } from "./dev-agent-chrome";

function Section({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="px-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b] hover:bg-black/[0.03]"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {icon}
        {title}
      </button>
      {open ? <div className="pb-2">{children}</div> : null}
    </div>
  );
}

export function DevAgentExplorerPanel({ runtime }: { runtime: DevAgentRuntime }) {
  const [tab, setTab] = useState<"explorer" | "skills" | "inspector">("explorer");
  const capabilities = useExplorerCapabilities();

  return (
    <aside
      className="flex w-[300px] shrink-0 flex-col border-r bg-[#fbfbfd]"
      style={{ borderColor: "rgba(0,0,0,0.06)" }}
    >
      <ExplorerTabs active={tab} onChange={setTab} />
      <ExplorerToolbar />

      <button
        type="button"
        className="mx-3 mb-2 flex items-center justify-center gap-1.5 rounded-[10px] bg-[#6b4cff] px-3 py-2 text-[12px] font-semibold text-white shadow-[0_1px_2px_rgba(107,76,255,0.24)]"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Source
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto pb-3 text-[12px]">
        {tab === "explorer" ? (
          <>
            <Section title="Platform" icon={<Layers3 className="h-3 w-3" />}>
              <Section title="Sources" icon={<GitBranch className="h-3 w-3" />} defaultOpen>
                {DEV_AGENT_SOURCES.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between rounded-md px-3 py-1.5 text-[#3a3a3c] hover:bg-black/[0.03]"
                  >
                    <span className="flex items-center gap-2">
                      {source.id === "github" ? (
                        <GitBranch className="h-3.5 w-3.5 text-[#86868b]" />
                      ) : source.id === "openapi" ? (
                        <FileCode2 className="h-3.5 w-3.5 text-[#86868b]" />
                      ) : (
                        <Database className="h-3.5 w-3.5 text-[#86868b]" />
                      )}
                      {source.label}
                    </span>
                    <span className="text-[#34c759]">✓</span>
                  </div>
                ))}
              </Section>
            </Section>

            <Section title="Loops" icon={<Workflow className="h-3 w-3" />}>
              {DEV_AGENT_LOOPS.map((loop) => (
                <div key={loop.id} className="px-1">
                  <button
                    type="button"
                    onClick={() => runtime.selectLoop(loop.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium text-[#1d1d1f] hover:bg-black/[0.03]",
                      runtime.selectedLoopId === loop.id && "bg-[#f0edff] text-[#6b4cff]",
                    )}
                  >
                    <ChevronDown className="h-3 w-3 text-[#86868b]" />
                    {loop.label}
                  </button>
                  <div className="ml-5 space-y-0.5 border-l pl-2" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                    {loop.steps.map((step, index) => {
                      const running =
                        runtime.activeLoop?.id === loop.id &&
                        runtime.activeCapabilityId === step.capabilityId &&
                        runtime.flowStatus === "running";
                      return (
                        <div
                          key={`${loop.id}-${step.capabilityId}`}
                          className="flex items-center justify-between gap-2 py-1 pr-2 text-[11px] text-[#636366]"
                        >
                          <span>
                            {index + 1}. {step.capabilityId}
                          </span>
                          {step.permission === "approval" ? (
                            <Badge tone="approval">Approval</Badge>
                          ) : running ? (
                            <Badge tone="running">●</Badge>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </Section>

            <Section
              title={`Capabilities (${capabilities.length})`}
              icon={<ListTree className="h-3 w-3" />}
            >
              {capabilities.map((cap) => {
                const meta = getExplorerCapabilityMeta(cap.capabilityId);
                const active =
                  runtime.selectedCapabilityId === cap.capabilityId ||
                  runtime.activeCapabilityId === cap.capabilityId;
                const running =
                  runtime.activeCapabilityId === cap.capabilityId && runtime.isRunning;
                return (
                  <button
                    key={cap.capabilityId}
                    type="button"
                    onClick={() => runtime.selectCapability(cap.capabilityId)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-black/[0.03]",
                      active && "bg-[#f0edff]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[#1d1d1f]">{cap.label}</span>
                      <Badge
                        tone={
                          running
                            ? "running"
                            : meta.permission === "approval"
                              ? "approval"
                              : "auto"
                        }
                      >
                        {running
                          ? "Running"
                          : cap.source === "index"
                            ? "Published"
                            : meta.permission === "approval"
                              ? "Approval"
                              : "Auto"}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-[#86868b]">{cap.description}</span>
                  </button>
                );
              })}
            </Section>

            <Section title="Schemas (12)" icon={<FileCode2 className="h-3 w-3" />} defaultOpen={false}>
              <div className="px-3 py-2 text-[11px] text-[#86868b]">HotelSearchRequest, BookingDraft…</div>
            </Section>
          </>
        ) : (
          <div className="px-4 py-8 text-center text-[12px] text-[#86868b]">
            {tab === "skills" ? "Agent Skills 패널" : "Inspector 패널"} — Explorer에서 Capability를 선택하세요.
          </div>
        )}
      </div>

      <div
        className="flex shrink-0 items-center justify-between border-t px-3 py-2 text-[11px] text-[#86868b]"
        style={{ borderColor: "rgba(0,0,0,0.06)" }}
      >
        <span>Rimvio SDK v1.2.3</span>
        <span className="flex items-center gap-1 text-[#248a3d]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#34c759]" />
          Connected
        </span>
      </div>
    </aside>
  );
}
