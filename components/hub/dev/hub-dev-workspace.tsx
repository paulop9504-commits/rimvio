"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HubDevAgentSimulation } from "@/components/hub/dev/hub-dev-agent-simulation";
import { HubDevAiBuild } from "@/components/hub/dev/hub-dev-ai-build";
import { HubDevCapabilityConfig } from "@/components/hub/dev/hub-dev-capability-config";
import { HubDevCapabilityList } from "@/components/hub/dev/hub-dev-capability-view";
import { HubDevCommandPalette } from "@/components/hub/dev/hub-dev-command-palette";
import { HubDevRightPanel } from "@/components/hub/dev/hub-dev-right-panel";
import { HubDevSidebar } from "@/components/hub/dev/hub-dev-sidebar";
import { HubDevTopbar } from "@/components/hub/dev/hub-dev-topbar";
import { DataStep } from "@/components/hub/platform/steps/data-step";
import { PlatformReviewStep } from "@/components/hub/platform/steps/review-step";
import { PlatformPermissionsStep } from "@/components/hub/platform/steps/permissions-step";
import { HubDevWorkflowEditor } from "@/components/hub/dev/hub-dev-workflow-editor";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import { useHubPlatformWizard } from "@/hooks/use-hub-platform-wizard";
import {
  blueprintFromDraft,
  resolvePlatformDraftFromBuildPrompt,
} from "@/lib/hub/dev/blueprint";
import { syncPlatformManifestJson } from "@/lib/hub/dev/capability-inspector";
import type { HubDevNavId } from "@/lib/hub/dev/platform-nav";
import type { PlatformBlueprintView } from "@/lib/hub/dev/platform-nav";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";

function parseNav(value: string | null): HubDevNavId {
  const allowed: HubDevNavId[] = [
    "overview",
    "ai-build",
    "capabilities",
    "data",
    "workflows",
    "runtime",
    "permissions",
    "integrations",
    "commerce",
    "logs",
    "tests",
    "deployments",
    "versions",
    "configuration",
    "hub-discover",
    "hub-published",
  ];
  if (value && allowed.includes(value as HubDevNavId)) return value as HubDevNavId;
  return "ai-build";
}

export function HubDevWorkspace() {
  const wizard = useHubPlatformWizard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeNav, setActiveNav] = useState<HubDevNavId>(() =>
    parseNav(searchParams.get("nav")),
  );
  const [buildPrompt, setBuildPrompt] = useState("");
  const [pendingBlueprint, setPendingBlueprint] = useState<PlatformBlueprintView | null>(null);
  const [building, setBuilding] = useState(false);
  const [platformCreated, setPlatformCreated] = useState(false);
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string | null>(() =>
    searchParams.get("cap"),
  );
  const [configScope, setConfigScope] = useState<"capability" | "platform">("platform");
  const [agentSeed, setAgentSeed] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [previewOn, setPreviewOn] = useState(true);
  const [selectedWorkflowNodeId, setSelectedWorkflowNodeId] = useState<string | null>(null);

  const syncUrl = useCallback(
    (nav: HubDevNavId, capId?: string | null) => {
      const params = new URLSearchParams();
      params.set("nav", nav);
      if (capId) params.set("cap", capId);
      router.replace(`/hub/workspace?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const setNav = useCallback(
    (nav: HubDevNavId, capId?: string | null) => {
      setActiveNav(nav);
      syncUrl(nav, capId ?? selectedCapabilityId);
    },
    [selectedCapabilityId, syncUrl],
  );

  useEffect(() => {
    const nav = parseNav(searchParams.get("nav"));
    setActiveNav(nav);
    const cap = searchParams.get("cap");
    if (cap) setSelectedCapabilityId(cap);
  }, [searchParams]);

  useEffect(() => {
    if (!wizard.hydrated) return;
    if (wizard.draft.actions.length > 0 && wizard.draft.id !== "used.market") {
      setPlatformCreated(true);
      if (!selectedCapabilityId && wizard.draft.actions[0]) {
        setSelectedCapabilityId(wizard.draft.actions[0].id);
      }
    }
    if (
      wizard.draft.actions.length > 0 &&
      (!wizard.draft.manifestJson || wizard.draft.manifestJson.length < 32)
    ) {
      wizard.updateDraft({ manifestJson: syncPlatformManifestJson(wizard.draft) });
    }
  }, [wizard.hydrated, wizard.draft.actions, wizard.draft.id, wizard.draft.manifestJson, selectedCapabilityId, wizard]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const capabilityWizard = wizard as unknown as HubCapabilityWizard;

  const deployExecutor = useMemo<DeployExecutorCallbacks>(
    () => ({
      mode: "platform",
      getDraft: () => wizard.draft,
      updateDraft: (patch) => wizard.updateDraft(patch),
      runSandboxTest: () => wizard.runSandboxTest(),
      onPublishSuccess: (platformId) => {
        wizard.completeAgentPublish(platformId);
        wizard.saveDraftNow();
      },
      onGoToStep: (step) => wizard.goToStep(step as typeof wizard.currentStep),
    }),
    [wizard],
  );

  const handleBuild = useCallback(async () => {
    setBuilding(true);
    await new Promise((r) => setTimeout(r, 600));
    const draft = resolvePlatformDraftFromBuildPrompt(buildPrompt);
    if (draft) {
      const manifestJson = syncPlatformManifestJson(draft);
      const withManifest = { ...draft, manifestJson };
      setPendingBlueprint(blueprintFromDraft(withManifest));
      wizard.updateDraft(withManifest);
    }
    setBuilding(false);
  }, [buildPrompt, wizard]);

  const handleCreatePlatform = useCallback(() => {
    setPlatformCreated(true);
    const firstId = wizard.draft.actions[0]?.id ?? null;
    if (firstId) setSelectedCapabilityId(firstId);
    setNav("capabilities", firstId);
  }, [setNav, wizard.draft.actions]);

  const handleSelectCapability = useCallback(
    (id: string) => {
      setSelectedCapabilityId(id);
      syncUrl(activeNav, id);
    },
    [activeNav, syncUrl],
  );

  const handleViewConfiguration = useCallback(
    (actionId: string) => {
      setSelectedCapabilityId(actionId);
      setConfigScope("capability");
      setNav("configuration", actionId);
    },
    [setNav],
  );

  const handleEditCapabilityWithAi = useCallback((name: string) => {
    setAgentSeed(`${name} capability를 Agent가 사용할 수 있도록 검토하고 필요한 스키마·권한을 제안해줘.`);
  }, []);

  const selectedAction = useMemo(
    () => wizard.draft.actions.find((a) => a.id === selectedCapabilityId) ?? null,
    [wizard.draft.actions, selectedCapabilityId],
  );

  const handlePublish = useCallback(() => {
    void wizard.publishPlatform();
  }, [wizard]);

  const handleCommand = useCallback(
    (id: string) => {
      const map: Record<string, HubDevNavId> = {
        ai: "ai-build",
        cap: "capabilities",
        test: "tests",
        deploy: "deployments",
        publish: "deployments",
        logs: "logs",
        runtime: "runtime",
      };
      const nav = map[id];
      if (nav) setNav(nav);
      if (id === "config") {
        setConfigScope("platform");
        setNav("configuration");
      }
      if (id === "test") void wizard.runSandboxTest();
      if (id === "publish") handlePublish();
    },
    [handlePublish, setNav, wizard],
  );

  if (!wizard.hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#0c0e12] text-[#6b7684]">
        Workspace 로딩 중…
      </div>
    );
  }

  const showAiBuildFirst = !platformCreated && activeNav === "ai-build";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0c0e12]">
      <HubDevTopbar
        platformName={wizard.draft.name}
        environment="Development"
        previewActive={previewOn}
        onTogglePreview={() => setPreviewOn((v) => !v)}
        onRun={() => void wizard.runSandboxTest()}
        onDeploy={() => setAgentSeed("배포해")}
        onPublish={handlePublish}
        publishDisabled={!wizard.publishReady}
        onOpenCommandPalette={() => setPaletteOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <HubDevSidebar
          platformName={wizard.draft.name}
          platformStatus={
            wizard.publishStatus === "pending-review" ? "Production" : "Development"
          }
          activeNav={activeNav}
          onNavChange={setNav}
          capabilityCount={wizard.draft.actions.length}
          testCount={wizard.testsPassed ? 1 : 0}
          version={`v${wizard.draft.version}`}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {activeNav === "ai-build" ? (
            <HubDevAiBuild
              prompt={buildPrompt}
              onPromptChange={setBuildPrompt}
              onBuild={() => void handleBuild()}
              building={building}
              blueprint={pendingBlueprint ?? (platformCreated ? blueprintFromDraft(wizard.draft) : null)}
              onCreatePlatform={handleCreatePlatform}
              onSeeDetails={() => {
                setConfigScope("platform");
                setNav("configuration");
              }}
            />
          ) : activeNav === "capabilities" ? (
            <HubDevCapabilityList
              draft={wizard.draft}
              actions={wizard.draft.actions}
              selectedId={selectedCapabilityId}
              testsPassed={wizard.testsPassed}
              onSelect={handleSelectCapability}
              onViewConfiguration={handleViewConfiguration}
              onTest={() => void wizard.runSandboxTest()}
              onEditWithAi={(action) => handleEditCapabilityWithAi(action.name)}
              onOpenCode={() => setNav("configuration", selectedCapabilityId)}
            />
          ) : activeNav === "configuration" ? (
            <HubDevCapabilityConfig
              wizard={capabilityWizard}
              draft={wizard.draft}
              selectedAction={selectedAction}
              scope={configScope}
              onScopeChange={setConfigScope}
              onApplyDraft={(next) => wizard.updateDraft(next)}
            />
          ) : activeNav === "data" ? (
            <PanelShell>
              <DataStep wizard={wizard} />
            </PanelShell>
          ) : activeNav === "workflows" ? (
            <HubDevWorkflowEditor
              draft={wizard.draft}
              selectedNodeId={selectedWorkflowNodeId}
              onSelectNode={setSelectedWorkflowNodeId}
            />
          ) : activeNav === "permissions" ? (
            <PanelShell>
              <PlatformPermissionsStep wizard={wizard} />
            </PanelShell>
          ) : activeNav === "tests" ? (
            <HubDevAgentSimulation
              draft={wizard.draft}
              onComplete={(passed) => {
                if (passed) void wizard.runSandboxTest();
              }}
            />
          ) : activeNav === "deployments" ? (
            <PanelShell>
              <PlatformReviewStep wizard={wizard} />
            </PanelShell>
          ) : activeNav === "overview" ? (
            <PlatformOverview draft={wizard.draft} onOpenBuild={() => setNav("ai-build")} />
          ) : (
            <ComingSoon nav={activeNav} />
          )}
        </main>

        {(showAiBuildFirst || previewOn) && (
          <HubDevRightPanel
            activeNav={activeNav}
            draft={wizard.draft}
            testsPassed={wizard.testsPassed}
            selectedCapabilityId={selectedCapabilityId}
            executor={deployExecutor}
            onApplyPatch={(p) => wizard.updateDraft(p)}
            agentSeed={agentSeed}
            onSeedConsumed={() => setAgentSeed(null)}
            showPreview={previewOn}
            publishReady={wizard.publishReady}
            onPublish={handlePublish}
            onViewConfiguration={() => {
              if (selectedCapabilityId) handleViewConfiguration(selectedCapabilityId);
            }}
            onTest={() => void wizard.runSandboxTest()}
            onEditWithAi={() => {
              if (selectedAction) handleEditCapabilityWithAi(selectedAction.name);
            }}
          />
        )}
      </div>

      <HubDevCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={handleCommand}
      />
    </div>
  );
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
      {children}
    </div>
  );
}

function PlatformOverview({
  draft,
  onOpenBuild,
}: {
  draft: ReturnType<typeof useHubPlatformWizard>["draft"];
  onOpenBuild: () => void;
}) {
  const bp = blueprintFromDraft(draft);
  return (
    <div className="overflow-y-auto p-6 rimvio-scroll-touch">
      <h2 className="text-[18px] font-bold text-[#f2f4f6]">{draft.name}</h2>
      <p className="mt-1 text-[13px] text-[#6b7684]">{draft.description}</p>
      <button
        type="button"
        onClick={onOpenBuild}
        className="mt-4 text-[12px] font-medium text-[#8ec0ff] hover:underline"
      >
        ✦ Open AI Build
      </button>
      <pre className="mt-6 rounded-xl border border-white/[0.08] bg-[#151820] p-4 font-mono text-[11px] leading-relaxed text-[#b0b8c1]">
        {`${draft.name}\n├── UI\n│   ├── Search\n│   ├── Hotel Detail\n│   └── Booking\n├── Capabilities\n${bp.capabilities.map((c) => `│   ├── ${c}`).join("\n")}\n├── Data\n${bp.dataModels.map((d) => `│   ├── ${d}`).join("\n")}\n└── Workflows\n    └── ${bp.workflows[0]}`}
      </pre>
    </div>
  );
}

function ComingSoon({ nav }: { nav: HubDevNavId }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <p className="text-[14px] font-semibold text-[#b0b8c1]">{nav}</p>
      <p className="mt-2 max-w-sm text-[12px] text-[#6b7684]">
        Phase 8–9: Runtime logs · Commerce panel.
        <span className="mt-2 block text-[10px] text-amber-500/80">Planned — not fake production metrics</span>
      </p>
    </div>
  );
}
