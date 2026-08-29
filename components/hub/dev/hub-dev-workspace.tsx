"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HubDevCommandPalette } from "@/components/hub/dev/hub-dev-command-palette";
import { HubDevTopbar } from "@/components/hub/dev/hub-dev-topbar";
import { HubDevProjectSidebar } from "@/components/hub/dev/hub-dev-project-sidebar";
import { HubDevCenterPane } from "@/components/hub/dev/hub-dev-center-pane";
import { HubDevAgentOperator } from "@/components/hub/dev/hub-dev-agent-operator";
import type { HubCapabilityWizard } from "@/hooks/use-hub-capability-wizard";
import { useHubPlatformWizard } from "@/hooks/use-hub-platform-wizard";
import { syncPlatformManifestJson } from "@/lib/hub/dev/capability-inspector";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";
import {
  metaFromDraft,
  readActivePlatformId,
  readStoredPlatform,
  setActivePlatformId,
  upsertPlatform,
} from "@/lib/hub/dev/platform-registry";
import {
  analyzePlatformIngress,
  type AnalyzedPlatformBlueprint,
} from "@/lib/hub/dev/platform-analyzer";
import {
  activitiesFromAnalyze,
  buildProjectSnapshot,
  deriveProjectChanges,
  type DevProjectIssue,
  type DevProjectSource,
  type DevChangeReviewState,
} from "@/lib/hub/dev/dev-project-state";
import {
  parseDevWorkspacePane,
  type DevWorkspacePane,
} from "@/lib/hub/dev/dev-workspace-nav";
import { buildOperatorDiffForIssue, type OperatorDiff } from "@/lib/hub/dev/operator-diff";
import type { HubPublishOptions } from "@/lib/hub/dev/hub-publish-model";
import {
  clearPendingHubLoopResume,
  isHubDevStripeConnected,
  readHubDevConnections,
  readPendingHubLoopResume,
} from "@/lib/hub/dev/hub-connection-store";
import { completeHubStripeConnect, connectHubStripe } from "@/lib/hub/dev/hub-stripe-connect";

const OSAKA_DEMO_URL = "https://github.com/dev/osaka-stay";

export function HubDevWorkspace() {
  const wizard = useHubPlatformWizard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const platformIdParam = searchParams.get("platform");

  const [activePane, setActivePane] = useState<DevWorkspacePane>(() =>
    parseDevWorkspacePane(searchParams.get("pane"), searchParams.get("nav")),
  );
  const [platformCreated, setPlatformCreated] = useState(false);
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string | null>(
    () => searchParams.get("cap"),
  );
  const [agentSeed, setAgentSeed] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [connectValue, setConnectValue] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [blueprint, setBlueprint] = useState<AnalyzedPlatformBlueprint | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [connectedSource, setConnectedSource] = useState<DevProjectSource | null>(null);
  const [analyzedAtMs, setAnalyzedAtMs] = useState<number | null>(null);
  const [publishedAtMs, setPublishedAtMs] = useState<number | null>(null);
  const [operatorDiff, setOperatorDiff] = useState<OperatorDiff | null>(null);
  const [changeReview, setChangeReview] = useState<Record<string, DevChangeReviewState>>({});
  const [fixing, setFixing] = useState(false);
  const [extraActivities, setExtraActivities] = useState<
    ReturnType<typeof activitiesFromAnalyze> | null
  >(null);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [resumeLoopToken, setResumeLoopToken] = useState(0);
  const [resumeUtterance, setResumeUtterance] = useState<string | null>(null);

  useEffect(() => {
    setStripeConnected(isHubDevStripeConnected());
  }, []);

  useEffect(() => {
    if (!wizard.hydrated) return;
    if (searchParams.get("stripe_connected") !== "1") return;

    completeHubStripeConnect();
    setStripeConnected(true);

    const pending = readPendingHubLoopResume();
    setResumeUtterance(
      pending?.utterance ?? "Stripe 연결 완료 — 결제 capability 이어서 진행",
    );
    clearPendingHubLoopResume();
    setResumeLoopToken((t) => t + 1);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("stripe_connected");
    router.replace(`/hub/workspace?${params.toString()}`, { scroll: false });
  }, [wizard.hydrated, searchParams, router]);

  const handleConnectStripe = useCallback(async () => {
    const pid = platformIdParam ?? wizard.draft.id;
    const returnPath = `/hub/workspace?platform=${encodeURIComponent(pid)}&stripe_connected=1`;
    const result = await connectHubStripe({ returnPath, platformId: pid });

    if (result.ok && result.mode === "mock") {
      setStripeConnected(true);
      const pending = readPendingHubLoopResume();
      setResumeUtterance(
        pending?.utterance ?? "Stripe 연결 완료 — 결제 capability 이어서 진행",
      );
      clearPendingHubLoopResume();
      setResumeLoopToken((t) => t + 1);
    }
  }, [platformIdParam, wizard.draft.id]);

  const hubConnections = useMemo(() => readHubDevConnections(), [stripeConnected]);

  const syncUrl = useCallback(
    (pane: DevWorkspacePane, capId?: string | null) => {
      const params = new URLSearchParams();
      params.set("pane", pane);
      const pid = platformIdParam ?? readActivePlatformId();
      if (pid) params.set("platform", pid);
      if (capId) params.set("cap", capId);
      router.replace(`/hub/workspace?${params.toString()}`, { scroll: false });
    },
    [platformIdParam, router],
  );

  const setPane = useCallback(
    (pane: DevWorkspacePane, capId?: string | null) => {
      setActivePane(pane);
      syncUrl(pane, capId ?? selectedCapabilityId);
    },
    [selectedCapabilityId, syncUrl],
  );

  useEffect(() => {
    setActivePane(parseDevWorkspacePane(searchParams.get("pane"), searchParams.get("nav")));
    const cap = searchParams.get("cap");
    if (cap) setSelectedCapabilityId(cap);
  }, [searchParams]);

  useEffect(() => {
    if (!wizard.hydrated) return;
    const pid = platformIdParam ?? readActivePlatformId();
    if (pid) {
      const stored = readStoredPlatform(pid);
      if (stored && stored.draft.id !== wizard.draft.id) {
        wizard.updateDraft(stored.draft);
        setPlatformCreated(true);
        setActivePlatformId(pid);
      }
    }
  }, [wizard.hydrated, platformIdParam, wizard]);

  useEffect(() => {
    if (!wizard.hydrated || !platformCreated) return;
    const pid = platformIdParam ?? wizard.draft.id;
    if (!pid || wizard.draft.actions.length === 0) return;
    const existing = readStoredPlatform(pid);
    upsertPlatform({
      meta: metaFromDraft(wizard.draft, existing?.meta.ingressLabel ?? "Workspace", {
        createdAtIso: existing?.meta.createdAtIso,
        agentUsage: existing?.meta.agentUsage ?? 0,
        successRate: existing?.meta.successRate ?? 0,
        rimvioCertified: existing?.meta.rimvioCertified ?? false,
        status:
          wizard.publishStatus === "published"
            ? "published"
            : existing?.meta.status ?? "agent_ready",
      }),
      draft: wizard.draft,
    });
  }, [wizard.draft, wizard.hydrated, platformCreated, platformIdParam, wizard.publishStatus]);

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

  useEffect(() => {
    if (wizard.publishStatus === "published" && publishedAtMs === null) {
      setPublishedAtMs(Date.now());
    }
  }, [wizard.publishStatus, publishedAtMs]);

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

  const snapshot = useMemo(() => {
    const base = buildProjectSnapshot({
      draft: wizard.draft,
      uploadedFiles,
      connectedSource,
      testsPassed: wizard.testsPassed,
      publishStatus: wizard.publishStatus,
      publishedAtMs: publishedAtMs ?? undefined,
      extraActivities: extraActivities ?? undefined,
    });
    const visibleChanges = base.changes.filter((ch) => changeReview[ch.id] !== "rejected");
    const pendingCount = visibleChanges.filter(
      (ch) => (changeReview[ch.id] ?? "pending") === "pending",
    ).length;
    return {
      ...base,
      changes: visibleChanges,
      changesCount: pendingCount,
    };
  }, [
    wizard.draft,
    uploadedFiles,
    connectedSource,
    wizard.testsPassed,
    wizard.publishStatus,
    extraActivities,
    changeReview,
    publishedAtMs,
  ]);

  useEffect(() => {
    const changes = deriveProjectChanges(wizard.draft);
    if (changes.length === 0) return;
    setChangeReview((prev) => {
      const next = { ...prev };
      for (const ch of changes) {
        if (!next[ch.id]) next[ch.id] = "pending";
      }
      return next;
    });
  }, [wizard.draft.actions.length, wizard.draft.id]);

  const runAnalyze = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      setAnalyzing(true);
      setAgentSeed(`이 프로젝트를 Rimvio에 연결해줘: ${trimmed}`);

      const kind = /github|gitlab|bitbucket/i.test(trimmed)
        ? "github"
        : /openapi|swagger|\.json/i.test(trimmed)
          ? "openapi"
          : "api";

      const result = await analyzePlatformIngress({ kind, value: trimmed });
      setAnalyzing(false);
      if (!result) return;

      setConnectedSource({
        id: `src-${kind}`,
        label: result.ingressLabel,
        kind,
        detail: trimmed,
      });
      setBlueprint(result);
      setAnalyzedAtMs(Date.now());
      setExtraActivities(activitiesFromAnalyze(result));
      const withManifest = { ...result.draft, manifestJson: syncPlatformManifestJson(result.draft) };
      wizard.updateDraft(withManifest);
      setPlatformCreated(true);
      setActivePlatformId(withManifest.id);
      upsertPlatform({
        meta: metaFromDraft(withManifest, result.ingressLabel, { status: "agent_ready" }),
        draft: withManifest,
      });
      syncUrl("ade", null);
    },
    [syncUrl, wizard],
  );

  const handleConnect = useCallback(async () => {
    const value = connectValue.trim();
    if (!value) return;
    await runAnalyze(value);
  }, [connectValue, runAnalyze]);

  const handleConnectGithub = useCallback(async () => {
    setConnectValue(OSAKA_DEMO_URL);
    await runAnalyze(OSAKA_DEMO_URL);
  }, [runAnalyze]);

  const handleLoadDemo = useCallback(async () => {
    setConnectValue(OSAKA_DEMO_URL);
    await runAnalyze(OSAKA_DEMO_URL);
    setDemoLoaded(true);
  }, [runAnalyze]);

  const handleReAnalyze = useCallback(async () => {
    const value =
      connectValue.trim() ||
      connectedSource?.detail ||
      (wizard.draft.actions.length > 0 ? OSAKA_DEMO_URL : "");
    if (!value) {
      await handleLoadDemo();
      return;
    }
    await runAnalyze(value);
  }, [connectValue, connectedSource?.detail, wizard.draft.actions.length, runAnalyze, handleLoadDemo]);

  useEffect(() => {
    if (!wizard.hydrated || demoLoaded) return;
    if (searchParams.get("demo") !== "osaka") return;
    if (wizard.draft.actions.length > 0) return;
    void handleLoadDemo();
  }, [wizard.hydrated, wizard.draft.actions.length, demoLoaded, searchParams, handleLoadDemo]);

  const handleFilesDrop = useCallback((files: FileList) => {
    const names = [...files].map((f) => f.name);
    setUploadedFiles((prev) => [...new Set([...prev, ...names])]);
    setAgentSeed(`이 파일들 연결해줘: ${names.join(", ")}`);
  }, []);

  const handleFixIssue = useCallback(
    async (issue: DevProjectIssue) => {
      setFixing(true);
      setOperatorDiff(buildOperatorDiffForIssue(issue, wizard.draft.actions));
      setAgentSeed(issue.fixPrompt);
      await new Promise((r) => setTimeout(r, 600));
      if (issue.id.startsWith("issue-approval") || issue.id.startsWith("issue-auth")) {
        wizard.updateDraft({
          actions: wizard.draft.actions.map((a) =>
            issue.capabilityId && a.name === issue.capabilityId
              ? { ...a, approvalRequired: true }
              : a,
          ),
        });
      }
      if (issue.id === "issue-manifest") {
        wizard.updateDraft({ manifestJson: syncPlatformManifestJson(wizard.draft) });
      }
      if (issue.id.startsWith("issue-schema")) {
        wizard.updateDraft({
          actions: wizard.draft.actions.map((a) =>
            issue.capabilityId && a.name === issue.capabilityId
              ? { ...a, outputSchema: `${a.name}.response.v1` }
              : a,
          ),
        });
      }
      setFixing(false);
    },
    [wizard],
  );

  const handleFixAllIssues = useCallback(async () => {
    setFixing(true);
    const firstIssue = snapshot.issues[0];
    if (firstIssue) {
      setOperatorDiff(buildOperatorDiffForIssue(firstIssue, wizard.draft.actions));
    }
    setAgentSeed("발견된 issues를 모두 자동으로 수정하고 test까지 실행해줘.");
    await new Promise((r) => setTimeout(r, 900));
    wizard.updateDraft({
      manifestJson: syncPlatformManifestJson(wizard.draft),
      actions: wizard.draft.actions.map((a) => ({
        ...a,
        approvalRequired:
          a.approvalRequired ||
          a.name.includes("payment") ||
          a.name.includes("commit") ||
          a.name.includes("confirm"),
        outputSchema: a.outputSchema.includes(".v")
          ? a.outputSchema
          : `${a.name}.response.v1`,
      })),
    });
    await wizard.runSandboxTest();
    setFixing(false);
    setOperatorDiff(null);
    setPane("status");
  }, [setPane, snapshot.issues, wizard]);

  const handleApplyDiff = useCallback(() => {
    setOperatorDiff(null);
    void wizard.runSandboxTest();
  }, [wizard]);

  const handleAcceptAllChanges = useCallback(() => {
    setChangeReview((prev) => {
      const next = { ...prev };
      for (const ch of snapshot.changes) {
        next[ch.id] = "accepted";
      }
      return next;
    });
  }, [snapshot.changes]);

  const handleRejectChange = useCallback((changeId: string) => {
    setChangeReview((prev) => ({ ...prev, [changeId]: "rejected" }));
  }, []);

  const handlePublish = useCallback(
    (options?: HubPublishOptions) => {
      void wizard.publishPlatform(options);
      setPublishedAtMs(Date.now());
    },
    [wizard],
  );

  const handleCommand = useCallback(
    (id: string) => {
      const map: Record<string, DevWorkspacePane> = {
        ai: "ade",
        cap: "capabilities",
        test: "tests",
        deploy: "deploy",
        publish: "deploy",
        logs: "ade",
        runtime: "deploy",
        config: "capabilities",
      };
      const pane = map[id];
      if (pane) setPane(pane);
      if (id === "test") void wizard.runSandboxTest();
    },
    [setPane, wizard],
  );

  if (!wizard.hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#f4f5f7] text-[#9ca3af]">
        Workspace 로딩 중…
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#f4f5f7]">
      <HubDevTopbar
        platformName={wizard.draft.name}
        environment="Development"
        onRun={() => void wizard.runSandboxTest()}
        onDeploy={() => setAgentSeed("배포해")}
        onPublish={() => setPane("deploy")}
        publishDisabled={!wizard.publishReady}
        onOpenCommandPalette={() => setPaletteOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <HubDevProjectSidebar
          platformName={wizard.draft.name}
          draft={wizard.draft}
          activePane={activePane}
          snapshot={snapshot}
          onPaneChange={setPane}
          onOpenAde={() => setPane("ade")}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <HubDevCenterPane
            pane={activePane}
            draft={wizard.draft}
            snapshot={snapshot}
            selectedCapabilityId={selectedCapabilityId}
            testsPassed={wizard.testsPassed}
            analyzing={analyzing}
            blueprint={blueprint}
            connectedSource={connectedSource}
            analyzedAtMs={analyzedAtMs}
            connectValue={connectValue}
            onConnectValueChange={setConnectValue}
            onConnect={() => void handleConnect()}
            onConnectGithub={() => void handleConnectGithub()}
            onLoadDemo={() => void handleLoadDemo()}
            onFilesDrop={handleFilesDrop}
            onSelectCapability={(id) => {
              setSelectedCapabilityId(id);
              syncUrl(activePane, id);
            }}
            onFixIssue={(issue) => void handleFixIssue(issue)}
            onPublish={handlePublish}
            wizard={capabilityWizard}
            publishStatus={wizard.publishStatus}
            onTestComplete={() => void wizard.runSandboxTest()}
            changeReview={changeReview}
            onAcceptAllChanges={handleAcceptAllChanges}
            onRejectChange={handleRejectChange}
            onReviewChanges={() => setPane("changes")}
            onTestInvoke={() => void wizard.runSandboxTest()}
            onAnalyzePlatform={() => void handleReAnalyze()}
            onFixAllIssues={() => void handleFixAllIssues()}
            onRunTests={() => {
              setPane("tests");
              void wizard.runSandboxTest();
            }}
            onPreview={() => {
              document.getElementById("blueprint-section-quick-actions")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
        </main>

        <HubDevAgentOperator
          draft={wizard.draft}
          snapshot={snapshot}
          testsPassed={wizard.testsPassed}
          analyzing={analyzing}
          executor={deployExecutor}
          onApplyPatch={(p) => wizard.updateDraft(p)}
          agentSeed={agentSeed}
          onSeedConsumed={() => setAgentSeed(null)}
          fixing={fixing}
          publishReady={wizard.publishReady}
          operatorDiff={operatorDiff}
          onApplyDiff={handleApplyDiff}
          onDismissDiff={() => setOperatorDiff(null)}
          onFixAll={() => void handleFixAllIssues()}
          onFixIssue={(issue) => void handleFixIssue(issue)}
          onPublish={() => setPane("deploy")}
          onRunTests={() => {
            setPane("tests");
            void wizard.runSandboxTest();
          }}
          onFocusAde={() => setPane("ade")}
          onAskOperator={(text) => setAgentSeed(text)}
          onReviewAllChanges={() => setPane("changes")}
          stripeConnected={stripeConnected || hubConnections.stripe}
          onConnectStripe={() => void handleConnectStripe()}
          resumeLoopToken={resumeLoopToken}
          resumeUtterance={resumeUtterance}
        />
      </div>

      <HubDevCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={handleCommand}
      />
    </div>
  );
}
