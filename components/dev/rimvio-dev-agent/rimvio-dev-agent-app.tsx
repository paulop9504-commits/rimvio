"use client";

import { useDevAgentRuntime } from "@/lib/dev/rimvio-dev-agent/use-dev-agent-runtime";
import { DevAgentChatPanel } from "./dev-agent-chat-panel";
import { DevAgentExplorerPanel } from "./dev-agent-explorer-panel";
import { DevAgentSandboxPanel } from "./dev-agent-sandbox-panel";
import { DevAgentStatusBar, DevAgentTopBar } from "./dev-agent-chrome";
import { DevAgentShell } from "./dev-agent-primitives";

export function RimvioDevAgentApp() {
  const runtime = useDevAgentRuntime();

  const handleRunPreview = () => {
    const capabilityId = runtime.selectedCapabilityId ?? "hotel.search";
    runtime.testCapability(capabilityId);
  };

  return (
    <DevAgentShell>
      <DevAgentTopBar onRunPreview={handleRunPreview} />
      <div className="relative flex min-h-0 flex-1">
        <DevAgentExplorerPanel runtime={runtime} />
        <DevAgentSandboxPanel runtime={runtime} />
        <DevAgentChatPanel runtime={runtime} />
      </div>
      <DevAgentStatusBar
        isRunning={runtime.isRunning}
        latencyMs={320}
        usage={12431}
      />
    </DevAgentShell>
  );
}
