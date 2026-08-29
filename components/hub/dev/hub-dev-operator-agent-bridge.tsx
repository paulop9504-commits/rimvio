"use client";

import { HubDeployAgentChat } from "@/components/hub/deploy/hub-deploy-agent-chat";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";
import type { PlatformDraft } from "@/lib/hub/platform/types";

/** Headless deploy agent — seed/chat wiring only, no visible UI. */
export function HubDevOperatorAgentBridge(props: {
  readonly draft: PlatformDraft;
  readonly testsPassed: boolean;
  readonly executor: DeployExecutorCallbacks;
  readonly onApplyPatch: (patch: Partial<PlatformDraft>) => void;
  readonly agentSeed: string | null;
  readonly onSeedConsumed: () => void;
}) {
  return (
    <div className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden>
      <HubDeployAgentChat
        mode="platform"
        draft={props.draft}
        testsPassed={props.testsPassed}
        executor={props.executor}
        onApplyPatch={props.onApplyPatch}
        seedUtterance={props.agentSeed}
        onSeedConsumed={props.onSeedConsumed}
      />
    </div>
  );
}
