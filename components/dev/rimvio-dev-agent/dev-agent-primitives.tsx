"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const DEV_AGENT_ACCENT = "#6b4cff";
export const DEV_AGENT_BG = "#f5f5f7";
export const DEV_AGENT_SURFACE = "#ffffff";
export const DEV_AGENT_BORDER = "rgba(0,0,0,0.08)";

export function DevAgentShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex h-dvh min-h-[720px] w-full flex-col overflow-hidden font-[system-ui,-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Segoe_UI',sans-serif] text-[#1d1d1f]"
      style={{ background: DEV_AGENT_BG }}
    >
      {children}
    </div>
  );
}

export function TrafficLights() {
  return (
    <div className="flex items-center gap-[7px]" aria-hidden>
      <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
      <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
      <span className="h-3 w-3 rounded-full bg-[#28c840]" />
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[14px] border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]",
        className,
      )}
      style={{ borderColor: DEV_AGENT_BORDER }}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "auto" | "approval" | "running";
}) {
  const styles = {
    neutral: "bg-[#f2f2f7] text-[#636366]",
    auto: "bg-[#e8f8ee] text-[#248a3d]",
    approval: "bg-[#fff4e5] text-[#c93400]",
    running: "bg-[#f0edff] text-[#6b4cff]",
  } as const;
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", styles[tone])}>
      {children}
    </span>
  );
}

export function Stars({ count }: { count: number }) {
  return (
    <span className="text-[11px] tracking-[1px] text-[#ff9500]" aria-label={`${count} stars`}>
      {"★".repeat(count)}
      {"☆".repeat(Math.max(0, 5 - count))}
    </span>
  );
}
