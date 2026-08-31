"use client";

import {
  ChevronDown,
  HelpCircle,
  LayoutGrid,
  MoreHorizontal,
  Play,
  RefreshCw,
  Search,
  Settings,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TrafficLights } from "./dev-agent-primitives";

export function DevAgentTopBar({
  onRunPreview,
}: {
  onRunPreview?: () => void;
}) {
  return (
    <header
      className="flex h-[52px] shrink-0 items-center justify-between border-b bg-[#fafafa]/90 px-4 backdrop-blur-md"
      style={{ borderColor: "rgba(0,0,0,0.06)" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <TrafficLights />
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6b4cff] text-[11px] font-bold text-white">
            R
          </div>
          <span className="text-[14px] font-semibold tracking-[-0.02em]">Rimvio Dev Agent</span>
        </div>
        <button
          type="button"
          className="ml-2 flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1 text-[12px] font-medium text-[#1d1d1f]"
          style={{ borderColor: "rgba(0,0,0,0.08)" }}
        >
          OsakaStay
          <ChevronDown className="h-3.5 w-3.5 text-[#86868b]" />
        </button>
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1 text-[12px] font-medium text-[#248a3d]"
          style={{ borderColor: "rgba(36,138,61,0.18)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#34c759]" />
          Production
          <ChevronDown className="h-3.5 w-3.5 text-[#86868b]" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRunPreview}
          className="flex items-center gap-1.5 rounded-[10px] border bg-white px-3 py-1.5 text-[12px] font-medium"
          style={{ borderColor: "rgba(0,0,0,0.08)" }}
        >
          <Play className="h-3.5 w-3.5" />
          Run Preview
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-[10px] bg-[#6b4cff] px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_1px_2px_rgba(107,76,255,0.28)]"
        >
          <Upload className="h-3.5 w-3.5" />
          Publish
        </button>
        <button type="button" className="rounded-lg p-2 text-[#86868b] hover:bg-black/[0.04]">
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <button type="button" className="rounded-lg p-2 text-[#86868b] hover:bg-black/[0.04]">
          <HelpCircle className="h-4 w-4" />
        </button>
        <div className="ml-1 h-8 w-8 rounded-full bg-gradient-to-br from-[#d8d2ff] to-[#6b4cff]" />
      </div>
    </header>
  );
}

export function DevAgentStatusBar({
  isRunning,
  latencyMs,
  usage,
}: {
  isRunning: boolean;
  latencyMs: number;
  usage: number;
}) {
  return (
    <footer
      className="flex h-7 shrink-0 items-center justify-between border-t bg-[#fafafa] px-4 text-[11px] text-[#86868b]"
      style={{ borderColor: "rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-center gap-4">
        <span>Rimvio SDK v1.2.3</span>
        <span className="flex items-center gap-1 text-[#248a3d]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#34c759]" />
          Connected
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className={isRunning ? "text-[#248a3d]" : ""}>
          {isRunning ? "Sandbox Running" : "Sandbox Ready"}
        </span>
        <span>Agent: Cloud Agent</span>
      </div>
      <div className="flex items-center gap-4">
        <span>Latency: {latencyMs}ms</span>
        <span>Usage: {usage.toLocaleString()}</span>
      </div>
    </footer>
  );
}

export function ExplorerTabs({
  active,
  onChange,
}: {
  active: "explorer" | "skills" | "inspector";
  onChange: (tab: "explorer" | "skills" | "inspector") => void;
}) {
  const tabs = [
    { id: "explorer" as const, label: "Explorer" },
    { id: "skills" as const, label: "Skills" },
    { id: "inspector" as const, label: "Inspector" },
  ];
  return (
    <div className="flex gap-1 border-b px-3 pt-2" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-t-lg px-2.5 py-1.5 text-[12px] font-medium",
            active === tab.id
              ? "bg-white text-[#1d1d1f] shadow-[0_-1px_0_0_rgba(0,0,0,0.04)]"
              : "text-[#86868b] hover:text-[#1d1d1f]",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function ExplorerToolbar() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      <div
        className="flex flex-1 items-center gap-2 rounded-[10px] border bg-[#f5f5f7] px-2.5 py-1.5 text-[12px] text-[#86868b]"
        style={{ borderColor: "rgba(0,0,0,0.06)" }}
      >
        <Search className="h-3.5 w-3.5" />
        Search anything…
        <span className="ml-auto rounded border bg-white px-1.5 py-0.5 text-[10px]">⌘K</span>
      </div>
      <button type="button" className="rounded-lg p-1.5 text-[#86868b] hover:bg-black/[0.04]">
        <Settings className="h-3.5 w-3.5" />
      </button>
      <button type="button" className="rounded-lg p-1.5 text-[#86868b] hover:bg-black/[0.04]">
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
      <button type="button" className="rounded-lg p-1.5 text-[#86868b] hover:bg-black/[0.04]">
        <LayoutGrid className="h-3.5 w-3.5" />
      </button>
      <button type="button" className="rounded-lg p-1.5 text-[#86868b] hover:bg-black/[0.04]">
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
