"use client";

import Link from "next/link";
import { DevAgentShell } from "@/components/dev/rimvio-dev-agent/dev-agent-primitives";
import { HubMvpAgentPanel } from "@/components/hub/dev/mvp/hub-mvp-agent-panel";
import { HubMvpSandboxPanel } from "@/components/hub/dev/mvp/hub-mvp-sandbox-panel";
import { HubMvpSidebar } from "@/components/hub/dev/mvp/hub-mvp-sidebar";
import { useHubMvpRuntime } from "@/lib/hub/dev/mvp/use-hub-mvp-runtime";

export function HubDevMvpWorkspace() {
  const runtime = useHubMvpRuntime();

  return (
    <DevAgentShell>
      <header
        className="flex h-12 shrink-0 items-center justify-between border-b bg-white/80 px-5 backdrop-blur-xl"
        style={{ borderColor: "rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-semibold tracking-[-0.02em]">Rimvio Dev Hub</span>
          <span className="rounded-full bg-[#f0edff] px-2 py-0.5 text-[10px] font-semibold text-[#6b4cff]">
            MVP
          </span>
        </div>
        <Link
          href="/hub/workspace?full=1"
          className="text-[12px] font-medium text-[#86868b] hover:text-[#6b4cff]"
        >
          Full workspace →
        </Link>
      </header>

      <div className="flex min-h-0 flex-1">
        <HubMvpSidebar runtime={runtime} />
        <HubMvpSandboxPanel runtime={runtime} />
        <HubMvpAgentPanel runtime={runtime} />
      </div>
    </DevAgentShell>
  );
}
