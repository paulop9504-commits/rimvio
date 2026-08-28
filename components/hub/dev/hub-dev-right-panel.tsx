"use client";

import { HubDeployAgentChat } from "@/components/hub/deploy/hub-deploy-agent-chat";
import { HubDevCapabilityInspector } from "@/components/hub/dev/hub-dev-capability-inspector";
import { HubDevLivePreview } from "@/components/hub/dev/hub-dev-live-preview";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";
import { buildCapabilityInspectorView } from "@/lib/hub/dev/capability-inspector";
import type { CapabilityDraft } from "@/lib/hub/capability/types";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { HubDevNavId } from "@/lib/hub/dev/platform-nav";
import { cn } from "@/lib/utils";

type HubDevRightPanelProps = {
  activeNav: HubDevNavId;
  draft: PlatformDraft;
  testsPassed: boolean;
  selectedCapabilityId: string | null;
  executor: DeployExecutorCallbacks;
  onApplyPatch: (patch: Partial<PlatformDraft>) => void;
  agentSeed: string | null;
  onSeedConsumed: () => void;
  showPreview: boolean;
  publishReady: boolean;
  onPublish: () => void;
  onViewConfiguration: () => void;
  onTest: () => void;
  onEditWithAi: () => void;
};

export function HubDevRightPanel({
  activeNav,
  draft,
  testsPassed,
  selectedCapabilityId,
  executor,
  onApplyPatch,
  agentSeed,
  onSeedConsumed,
  showPreview,
  publishReady,
  onPublish,
  onViewConfiguration,
  onTest,
  onEditWithAi,
}: HubDevRightPanelProps) {
  const showChat =
    activeNav === "ai-build" ||
    activeNav === "capabilities" ||
    activeNav === "configuration";

  const selectedAction = draft.actions.find((a) => a.id === selectedCapabilityId) ?? null;
  const capabilityInspector = selectedAction
    ? buildCapabilityInspectorView(selectedAction, draft, testsPassed)
    : null;

  const showCapabilityInspector =
    activeNav === "capabilities" && capabilityInspector !== null;

  return (
    <div className="flex w-[340px] shrink-0 flex-col border-l border-white/[0.06] bg-[#0e1014] xl:w-[380px]">
      {showChat ? (
        <div className="flex min-h-[40%] flex-1 flex-col border-b border-white/[0.06]">
          <p className="border-b border-white/[0.06] px-3 py-2 text-[10px] font-semibold uppercase text-[#6b7684]">
            AI Chat
          </p>
          <div className="min-h-0 flex-1">
            <HubDeployAgentChat
              mode="platform"
              draft={draft}
              testsPassed={testsPassed}
              executor={executor}
              onApplyPatch={onApplyPatch}
              seedUtterance={agentSeed}
              onSeedConsumed={onSeedConsumed}
            />
          </div>
        </div>
      ) : null}

      {showCapabilityInspector && capabilityInspector ? (
        <div className="min-h-0 flex-1 border-b border-white/[0.06]">
          <HubDevCapabilityInspector
            view={capabilityInspector}
            onViewConfiguration={onViewConfiguration}
            onTest={onTest}
            onEditWithAi={onEditWithAi}
          />
        </div>
      ) : null}

      {(showPreview && activeNav === "ai-build") || activeNav === "capabilities" ? (
        <div className={cn("min-h-0", showCapabilityInspector ? "h-[45%] shrink-0" : "flex-1")}>
          <HubDevLivePreview platformName={draft.name} />
        </div>
      ) : activeNav === "deployments" ? (
        <HubPublishInspector
          draft={draft}
          publishReady={publishReady}
          onPublish={onPublish}
        />
      ) : activeNav === "configuration" ? (
        <div className="flex flex-1 flex-col p-4 text-[11px] text-[#6b7684]">
          <p className="font-semibold text-[#b0b8c1]">Configuration Inspector</p>
          <p className="mt-2">
            Manifest · Permissions · Context edits apply to the Platform manifest used at
            publish time.
          </p>
          <p className="mt-2 font-mono text-[10px] text-[#4b5563]">
            {draft.manifestJson ? "✓ manifest synced" : "○ manifest pending"}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col p-4 text-[11px] text-[#6b7684]">
          <p className="font-semibold text-[#b0b8c1]">Inspector</p>
          <p className="mt-2">현재 섹션: {activeNav}</p>
        </div>
      )}
    </div>
  );
}

function HubPublishInspector({
  draft,
  publishReady,
  onPublish,
}: {
  draft: CapabilityDraft;
  publishReady: boolean;
  onPublish: () => void;
}) {
  return (
    <div className="flex h-full flex-col p-4">
      <p className="text-[12px] font-semibold text-[#f2f4f6]">Publish to Rimvio Hub</p>
      <p className="mt-1 text-[11px] text-[#6b7684]">Platform Distribution — not capability form submission</p>
      <ul className="mt-4 space-y-2 text-[11px] text-[#b0b8c1]">
        <li>Platform: {draft.name}</li>
        <li>Capabilities: {draft.actions.length}</li>
        <li>Version: v{draft.version}</li>
        <li>Tests: {publishReady ? "✓ Ready" : "○ Pending"}</li>
      </ul>
      <button
        type="button"
        onClick={onPublish}
        disabled={!publishReady}
        className="mt-auto w-full rounded-xl bg-gradient-to-r from-[#4593fc] to-[#6366f1] py-3 text-[13px] font-bold text-white disabled:opacity-40"
      >
        Publish to Rimvio Hub
      </button>
      <p className="mt-2 text-center text-[10px] text-[#6b7684]">
        Publish → Registry → Rimvio Agent
      </p>
    </div>
  );
}
