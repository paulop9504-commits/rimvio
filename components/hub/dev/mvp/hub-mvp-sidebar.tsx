"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ListTree, Plus, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/dev/rimvio-dev-agent/dev-agent-primitives";
import type { HubMvpRuntime } from "@/lib/hub/dev/mvp/use-hub-mvp-runtime";

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

export function HubMvpSidebar({ runtime }: { runtime: HubMvpRuntime }) {
  return (
    <aside
      className="flex w-[280px] shrink-0 flex-col border-r bg-[#fbfbfd]"
      style={{ borderColor: "rgba(0,0,0,0.06)" }}
    >
      <div className="border-b px-4 py-3" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <p className="text-[13px] font-semibold">Dev Hub</p>
        <p className="text-[11px] text-[#86868b]">능력 만들기</p>
      </div>

      <button
        type="button"
        onClick={runtime.startCreateCapability}
        className="mx-3 mt-3 flex items-center justify-center gap-1.5 rounded-[10px] bg-[#6b4cff] px-3 py-2.5 text-[12px] font-semibold text-white shadow-[0_1px_2px_rgba(107,76,255,0.24)]"
      >
        <Plus className="h-3.5 w-3.5" />
        Create Capability
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto py-3 text-[12px]">
        <Section title="Loops" icon={<Workflow className="h-3 w-3" />}>
          {runtime.loops.map((loop) => (
            <button
              key={loop.id}
              type="button"
              onClick={() => runtime.selectLoop(loop.id)}
              className={cn(
                "flex w-full flex-col gap-1 rounded-md px-2 py-1.5 text-left hover:bg-black/[0.03]",
                runtime.selectedLoopId === loop.id && "bg-[#f0edff]",
              )}
            >
              <span className="font-medium text-[#1d1d1f]">{loop.name}</span>
              <span className="text-[11px] text-[#86868b]">
                {loop.capabilityIds.join(" → ")}
              </span>
            </button>
          ))}
        </Section>

        <Section
          title={`Capabilities (${runtime.capabilities.length})`}
          icon={<ListTree className="h-3 w-3" />}
        >
          {runtime.capabilities.map((cap) => {
            const active = runtime.selectedCapabilityId === cap.id;
            return (
              <button
                key={cap.id}
                type="button"
                onClick={() => runtime.selectCapability(cap.id)}
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-black/[0.03]",
                  active && "bg-[#f0edff]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[#1d1d1f]">{cap.name}</span>
                  <Badge
                    tone={
                      cap.status === "published"
                        ? "auto"
                        : cap.status === "verified"
                          ? "running"
                          : "neutral"
                    }
                  >
                    {cap.status === "published" ? "Published" : cap.status === "verified" ? "Verified" : "Draft"}
                  </Badge>
                </div>
                <span className="text-[11px] text-[#86868b]">{cap.description}</span>
              </button>
            );
          })}
        </Section>
      </div>
    </aside>
  );
}
