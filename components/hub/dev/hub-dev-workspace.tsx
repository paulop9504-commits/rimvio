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
  readPlatformRegistry,
  readStoredPlatform,
  setActivePlatformId,
  subscribePlatformRegistry,
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
import { explainChanges } from "@/lib/hub/dev/hub-change-explanation";
import {
  parseDevWorkspacePane,
  type DevWorkspacePane,
} from "@/lib/hub/dev/dev-workspace-nav";
import type { HubStandardsView } from "@/lib/hub/standards";
import { buildOperatorDiffForIssue, type OperatorDiff } from "@/lib/hub/dev/operator-diff";
import type { HubPublishOptions } from "@/lib/hub/dev/hub-publish-model";
import {
  clearPendingHubLoopResume,
  readHubDevConnections,
  readPendingHubLoopResume,
} from "@/lib/hub/dev/hub-connection-store";
import {
  completeHubOAuthConnect,
  connectHubOAuthProvider,
  connectedParamForProvider,
  resumeUtteranceForProvider,
  parseOAuthProfileFromSearchParams,
} from "@/lib/hub/dev/hub-oauth-connect";
import { HubDevOAuthConnectSheet } from "@/components/hub/dev/hub-dev-oauth-connect-sheet";
import { HubDevGitHubConnectSheet } from "@/components/hub/dev/hub-dev-github-connect-sheet";
import { HUB_CONNECTIONS_UPDATED_EVENT } from "@/lib/hub/dev/hub-connection-store";
import {
  syncHubConnectionsFromServer,
  type HubConnectionsApiResponse,
} from "@/lib/hub/dev/hub-connection-client-sync";
import {
  clearPendingPublishApproval,
  readPendingPublishApproval,
} from "@/lib/hub/dev/hub-publish-pending-store";
import { undoHubCheckpoint } from "@/lib/hub/dev/hub-checkpoint-store";
import { executeApprovedPublish } from "@/lib/hub/dev/hub-publish-flow";
import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";
import {
  buildHubFileTree,
  mergeFileTouches,
  type HubFileTouchState,
} from "@/lib/hub/dev/hub-file-tree";
import { resolveDevModeLayout } from "@/lib/hub/dev/developer-mode";
import { subscribeHubWorkspaceCommand } from "@/lib/hub/dev/hub-workspace-commands";
import type { HubOperatorTab } from "@/lib/hub/dev/hub-workspace-commands";
import {
  readDevEnvironment,
  writeDevEnvironment,
  type DevEnvironment,
} from "@/lib/hub/dev/platform-context-values";
import { readDevExecutionLogForPlatform } from "@/lib/hub/dev/execution-log";
import type { DevCapabilityInvokeRecord } from "@/lib/hub/dev/invoke-dev-capability";
import { HubDevHelpSheet, HubDevNotificationSheet } from "@/components/hub/dev/hub-dev-chrome-sheets";
import { HubDevCreatorNav } from "@/components/hub/dev/hub-dev-creator-nav";
import {
  applyExperienceBlueprintToDraft,
  experienceBlueprintFromUtterance,
  invokeExperienceResource,
} from "@/lib/hub/dev/experience-os";

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
  const [githubConnected, setGithubConnected] = useState(false);
  const [vercelConnected, setVercelConnected] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [oauthSheetProvider, setOauthSheetProvider] = useState<HubPlatformProviderId | null>(null);
  const [githubConnectOpen, setGithubConnectOpen] = useState(false);
  const [liveUser, setLiveUser] = useState<HubConnectionsApiResponse["user"]>(null);
  const [resumeLoopToken, setResumeLoopToken] = useState(0);
  const [resumeUtterance, setResumeUtterance] = useState<string | null>(null);
  const [resumeProvider, setResumeProvider] = useState<HubPlatformProviderId | null>(null);
  const [fileTouches, setFileTouches] = useState<Record<string, HubFileTouchState>>({});
  const [agentRunning, setAgentRunning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [environment, setEnvironment] = useState<DevEnvironment>("Development");
  const [operatorTab, setOperatorTab] = useState<HubOperatorTab | null>(null);
  const [registryTick, setRegistryTick] = useState(0);
  const [ideaConsumed, setIdeaConsumed] = useState(false);

  const syncConnectionState = useCallback(() => {
    const connections = readHubDevConnections();
    setStripeConnected(connections.stripe);
    setGithubConnected(connections.github);
    setVercelConnected(connections.vercel);
    setSupabaseConnected(connections.supabase);
  }, []);

  const refreshLiveConnections = useCallback(async () => {
    try {
      const data = await syncHubConnectionsFromServer();
      setLiveUser(data.user);
      syncConnectionState();
      return data;
    } catch {
      syncConnectionState();
      return null;
    }
  }, [syncConnectionState]);

  useEffect(() => {
    void refreshLiveConnections();
    const onUpdate = () => void refreshLiveConnections();
    window.addEventListener(HUB_CONNECTIONS_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(HUB_CONNECTIONS_UPDATED_EVENT, onUpdate);
  }, [refreshLiveConnections]);

  const finishOAuthReturn = useCallback(
    async (provider: HubPlatformProviderId, profile?: Parameters<typeof completeHubOAuthConnect>[1]) => {
      await refreshLiveConnections();
      completeHubOAuthConnect(provider, profile);

      const pending = readPendingHubLoopResume();
      if (!pending || (pending.provider && pending.provider !== provider)) {
        return;
      }

      setResumeProvider(provider);
      setResumeUtterance(pending.utterance);
      clearPendingHubLoopResume();
      setResumeLoopToken((t) => t + 1);
    },
    [refreshLiveConnections],
  );

  useEffect(() => {
    if (!wizard.hydrated) return;

    const providers: HubPlatformProviderId[] = ["stripe", "github", "vercel", "supabase"];
    let matched: HubPlatformProviderId | null = null;
    for (const provider of providers) {
      const param = connectedParamForProvider(provider);
      if (param && searchParams.get(param) === "1") {
        matched = provider;
        break;
      }
    }
    if (!matched) return;

    const profile = parseOAuthProfileFromSearchParams(matched, searchParams);
    void finishOAuthReturn(matched, profile);

    const params = new URLSearchParams(searchParams.toString());
    for (const provider of providers) {
      const param = connectedParamForProvider(provider);
      if (param) params.delete(param);
    }
    params.delete("github_account");
    params.delete("github_avatar");
    params.delete("supabase_account");
    router.replace(`/hub/workspace?${params.toString()}`, { scroll: false });
  }, [wizard.hydrated, searchParams, router, finishOAuthReturn]);

  useEffect(() => {
    if (!wizard.hydrated) return;
    const pendingConnect = searchParams.get("connect") as HubPlatformProviderId | null;
    if (!pendingConnect || !["github", "vercel", "supabase", "stripe"].includes(pendingConnect)) {
      return;
    }

    void refreshLiveConnections().then((data) => {
      if (!data?.signedIn) return;
      if (pendingConnect === "github") {
        setGithubConnectOpen(true);
        return;
      }
      const pid = platformIdParam ?? wizard.draft.id;
      const connectedParam = connectedParamForProvider(pendingConnect) ?? `${pendingConnect}_connected`;
      const returnPath = `/hub/workspace?platform=${encodeURIComponent(pid)}&${connectedParam}=1`;
      void connectHubOAuthProvider({
        provider: pendingConnect,
        returnPath,
        platformId: pid,
      });
    });

    const params = new URLSearchParams(searchParams.toString());
    params.delete("connect");
    params.delete("login_required");
    params.delete("next");
    router.replace(`/hub/workspace?${params.toString()}`, { scroll: false });
  }, [wizard.hydrated, searchParams, router, platformIdParam, wizard.draft.id, refreshLiveConnections]);

  const handleConnectProvider = useCallback(
    async (provider: HubPlatformProviderId) => {
      const pid = platformIdParam ?? wizard.draft.id;
      const connectedParam = connectedParamForProvider(provider) ?? `${provider}_connected`;
      const returnPath = `/hub/workspace?platform=${encodeURIComponent(pid)}&${connectedParam}=1`;
      const result = await connectHubOAuthProvider({ provider, returnPath, platformId: pid });

      if (result.ok && result.mode === "login") {
        if (provider === "github") {
          setGithubConnectOpen(true);
        } else {
          setOauthSheetProvider(provider);
        }
        return;
      }
      if (result.ok && result.mode === "device" && provider === "github") {
        setGithubConnectOpen(true);
      }
    },
    [platformIdParam, wizard.draft.id],
  );

  const handleConnectStripe = useCallback(
    () => void handleConnectProvider("stripe"),
    [handleConnectProvider],
  );

  const handleConnectGithub = useCallback(
    () => void handleConnectProvider("github"),
    [handleConnectProvider],
  );

  const handleConnectVercel = useCallback(
    () => void handleConnectProvider("vercel"),
    [handleConnectProvider],
  );

  const handleConnectSupabase = useCallback(
    () => void handleConnectProvider("supabase"),
    [handleConnectProvider],
  );

  const handleUndoCheckpoint = useCallback(() => {
    const pid = platformIdParam ?? wizard.draft.id;
    const restored = undoHubCheckpoint(pid);
    if (restored) {
      wizard.updateDraft(restored);
    }
  }, [platformIdParam, wizard]);

  const handleApprovePublish = useCallback(() => {
    const pending = readPendingPublishApproval();
    const result = executeApprovedPublish({
      draft: wizard.draft,
      testsPassed: wizard.testsPassed,
    });
    clearPendingPublishApproval();

    if (result.published) {
      wizard.completeAgentPublish(result.platformId);
    }

    setResumeProvider(null);
    setResumeUtterance(
      pending?.utterance
        ? `${pending.utterance} — Publish 승인 완료`
        : "Publish 승인 완료 — capability index 등록됨",
    );
    setResumeLoopToken((t) => t + 1);
  }, [wizard]);

  const hubConnections = useMemo(
    () => readHubDevConnections(),
    [stripeConnected, githubConnected, vercelConnected, supabaseConnected],
  );

  const devLayout = useMemo(
    () =>
      resolveDevModeLayout({
        hasPlatform: platformCreated || wizard.draft.actions.length > 0,
        agentRunning,
        previewActive: activePane === "ade" || activePane === "tests",
      }),
    [platformCreated, wizard.draft.actions.length, agentRunning, activePane],
  );

  const autoFocusOperatorTab =
    agentRunning && devLayout.showTerminal ? ("activity" as const) : null;

  const fileTree = useMemo(
    () => buildHubFileTree({ draft: wizard.draft, touchedPaths: fileTouches }),
    [wizard.draft, fileTouches],
  );

  const handleAgentFileTouch = useCallback(
    (paths: readonly string[], touch: HubFileTouchState) => {
      setFileTouches((prev) => mergeFileTouches(prev, paths, touch));
    },
    [],
  );

  const standardsView = (searchParams.get("standards") as HubStandardsView | null) ?? "overview";

  const syncUrl = useCallback(
    (pane: DevWorkspacePane, capId?: string | null, standards?: HubStandardsView | null) => {
      const params = new URLSearchParams();
      params.set("pane", pane);
      const pid = platformIdParam ?? readActivePlatformId();
      if (pid) params.set("platform", pid);
      if (capId) params.set("cap", capId);
      if (pane === "standards" && standards && standards !== "overview") {
        params.set("standards", standards);
      }
      router.replace(`/hub/workspace?${params.toString()}`, { scroll: false });
    },
    [platformIdParam, router],
  );

  const setPane = useCallback(
    (pane: DevWorkspacePane, capId?: string | null) => {
      setActivePane(pane);
      syncUrl(pane, capId ?? selectedCapabilityId, pane === "standards" ? standardsView : null);
    },
    [selectedCapabilityId, standardsView, syncUrl],
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
    if (!wizard.hydrated || ideaConsumed) return;
    const idea = searchParams.get("idea")?.trim();
    if (!idea) return;
    setIdeaConsumed(true);
    const next = applyExperienceBlueprintToDraft(experienceBlueprintFromUtterance(idea));
    wizard.updateDraft(next);
    setAgentSeed(idea);
    setPlatformCreated(true);
    void invokeExperienceResource("experience.build", { utterance: idea }, {
      draft: next,
      updateDraft: (patch) => wizard.updateDraft(patch),
    });
  }, [wizard, searchParams, ideaConsumed]);

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
    setEnvironment(readDevEnvironment());
    return subscribePlatformRegistry(() => setRegistryTick((n) => n + 1));
  }, []);

  useEffect(() => {
    return subscribeHubWorkspaceCommand((command) => {
      if (command.kind === "open_pane") setPane(command.pane);
      if (command.kind === "open_preview") {
        setShowPreview(true);
        setPane("runtime");
      }
      if (command.kind === "close_preview") setShowPreview(false);
      if (command.kind === "open_operator_tab") setOperatorTab(command.tab);
      if (command.kind === "focus_capability") {
        setSelectedCapabilityId(command.capabilityId);
        setPane("capabilities", command.capabilityId);
      }
      if (command.kind === "test_invoke") {
        const action = wizard.draft.actions.find(
          (a) => a.id === command.capabilityId || a.name === command.capabilityId,
        );
        if (action) {
          setSelectedCapabilityId(action.id);
          setPane("ade");
          setAgentSeed(`${action.name} Capability를 Test Invoke로 실행하고 결과를 검증해줘`);
        }
      }
      if (command.kind === "loop_updated") {
        setPane("loops");
      }
      if (command.kind === "loop_test_result") {
        setPane("loops");
      }
    });
  }, [setPane, wizard.draft.actions]);

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

  const changeExplanations = useMemo(
    () => explainChanges(deriveProjectChanges(wizard.draft)),
    [wizard.draft],
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
          : /^https?:\/\//i.test(trimmed)
            ? "api"
            : "describe";

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

  const handleGithubSourceConnect = useCallback(async () => {
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
        loop: "loops",
        loops: "loops",
        test: "tests",
        deploy: "deploy",
        publish: "deploy",
        logs: "runtime",
        runtime: "runtime",
        config: "capabilities",
      };
      const pane = map[id];
      if (pane) setPane(pane);
      if (id === "test") void wizard.runSandboxTest();
      if (id === "logs") setOperatorTab("terminal");
      if (id === "ai") setOperatorTab("chat");
    },
    [setPane, wizard],
  );

  const handleSelectPlatform = useCallback(
    (id: string) => {
      setActivePlatformId(id);
      const stored = readStoredPlatform(id);
      if (stored) {
        wizard.updateDraft(stored.draft);
        setPlatformCreated(true);
      }
      const params = new URLSearchParams();
      params.set("pane", activePane);
      params.set("platform", id);
      router.replace(`/hub/workspace?${params.toString()}`, { scroll: false });
    },
    [activePane, router, wizard],
  );

  const handleEnvironmentChange = useCallback(
    (next: DevEnvironment) => {
      setEnvironment(next);
      writeDevEnvironment(next);
      if (next === "Preview") {
        setShowPreview(true);
        setPane("runtime");
      } else if (next === "Production") {
        setPane("deploy");
      }
    },
    [setPane],
  );

  const handleTestInvoke = useCallback(
    (capabilityId: string, record: DevCapabilityInvokeRecord) => {
      setExtraActivities((prev) => [
        ...(prev ?? []),
        {
          id: `invoke-${Date.now()}`,
          label: record.ok ? `Invoked ${capabilityId}` : `Invoke failed ${capabilityId}`,
          status: record.ok ? "done" : "warning",
        },
      ]);
      setAgentSeed(
        record.ok
          ? `${capabilityId} Test Invoke 성공 (${record.latencyMs}ms). 결과를 검증해줘.`
          : `${capabilityId} Test Invoke 실패: ${record.errorKo ?? "unknown"}. 원인을 분석해줘.`,
      );
    },
    [],
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
        platformId={platformIdParam ?? wizard.draft.id}
        platforms={(() => {
          void registryTick;
          return readPlatformRegistry();
        })()}
        environment={environment}
        previewActive={showPreview}
        onSelectPlatform={handleSelectPlatform}
        onEnvironmentChange={handleEnvironmentChange}
        onTogglePreview={() => {
          setShowPreview((v) => !v);
          if (!showPreview) setPane("runtime");
        }}
        onRun={() => {
          setShowPreview(true);
          setPane("runtime");
          setAgentSeed("Preview를 열고 스모크 검증해줘");
          void wizard.runSandboxTest();
        }}
        onDeploy={() => {
          setPane("deploy");
          setAgentSeed("배포해");
        }}
        onPublish={() => setPane("deploy")}
        publishDisabled={!wizard.publishReady}
        onOpenCommandPalette={() => setPaletteOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenNotifications={() => setNotifOpen(true)}
        notificationCount={snapshot.issuesCount + snapshot.changesCount}
        liveUser={liveUser}
      />

      <HubDevCreatorNav
        activePane={activePane}
        onPaneChange={setPane}
        onOpenAgent={() => setOperatorTab("chat")}
      />

      <div className="flex min-h-0 flex-1">
        <HubDevProjectSidebar
          platformName={wizard.draft.name}
          draft={wizard.draft}
          activePane={activePane}
          snapshot={snapshot}
          fileTree={fileTree}
          onPaneChange={setPane}
          onOpenAde={() => setPane("ade")}
          onSelectFile={(path) => {
            setPane("sources");
            setAgentSeed(`이 파일을 검토해줘: ${path}`);
          }}
          onStatusClick={(kind) => {
            if (kind === "agent") setPane("status");
            if (kind === "certified") setPane("standards");
            if (kind === "published") setPane("deploy");
          }}
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
            platformId={platformIdParam ?? wizard.draft.id}
            connections={hubConnections}
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
            changeExplanations={changeExplanations}
            onAcceptAllChanges={handleAcceptAllChanges}
            onRejectChange={handleRejectChange}
            onReviewChanges={() => setPane("changes")}
            onTestInvoke={handleTestInvoke}
            onAnalyzePlatform={() => {
              setAgentSeed("이 Platform을 분석하고 이슈를 찾아줘");
              void handleReAnalyze();
            }}
            onFixAllIssues={() => void handleFixAllIssues()}
            onRunTests={() => {
              setPane("tests");
              setAgentSeed("테스트와 verification을 실행해줘");
              void wizard.runSandboxTest();
            }}
            onPreview={() => {
              setShowPreview(true);
              setPane("runtime");
              setAgentSeed("Preview를 열고 스모크 검증해줘");
            }}
            standardsView={standardsView}
            onOpenPane={setPane}
            onAskOperator={(text) => setAgentSeed(text)}
            onConnectStripe={() => void handleConnectStripe()}
            onConnectVercel={() => void handleConnectVercel()}
            onConnectSupabase={() => void handleConnectSupabase()}
            onDraftPatch={(patch) => wizard.updateDraft(patch)}
            showPreview={showPreview}
            onBuildIdea={(text) => {
              const next = applyExperienceBlueprintToDraft(experienceBlueprintFromUtterance(text));
              wizard.updateDraft(next);
              setAgentSeed(text);
              void invokeExperienceResource("experience.build", { utterance: text }, {
                draft: next,
                updateDraft: (patch) => wizard.updateDraft(patch),
              });
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
          onConnectGithub={() => void handleConnectGithub()}
          onConnectVercel={() => void handleConnectVercel()}
          onConnectSupabase={() => void handleConnectSupabase()}
          onApprovePublish={handleApprovePublish}
          onUndoCheckpoint={handleUndoCheckpoint}
          resumeLoopToken={resumeLoopToken}
          resumeUtterance={resumeUtterance}
          resumeProvider={resumeProvider}
          onFileTouch={handleAgentFileTouch}
          onAgentRunningChange={setAgentRunning}
          agentRunning={agentRunning}
          autoFocusTab={operatorTab ?? autoFocusOperatorTab}
          onAcceptAllChanges={handleAcceptAllChanges}
          onPreview={() => {
            setShowPreview(true);
            setPane("runtime");
          }}
        />
      </div>

      <HubDevCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={handleCommand}
      />

      {oauthSheetProvider ? (
        <HubDevOAuthConnectSheet
          provider={oauthSheetProvider}
          open={Boolean(oauthSheetProvider)}
          onClose={() => setOauthSheetProvider(null)}
          onConnected={() => setOauthSheetProvider(null)}
          returnPath={`/hub/workspace?connect=${oauthSheetProvider}${platformIdParam ? `&platform=${encodeURIComponent(platformIdParam)}` : ""}`}
        />
      ) : null}

      <HubDevHelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
      <HubDevNotificationSheet
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        snapshot={snapshot}
        logs={readDevExecutionLogForPlatform(wizard.draft.id)}
        onOpenPane={setPane}
      />

      <HubDevGitHubConnectSheet
        open={githubConnectOpen}
        onClose={() => setGithubConnectOpen(false)}
        onConnected={(profile) => {
          setGithubConnected(true);
          void finishOAuthReturn("github", profile);
        }}
        returnPath={`/hub/workspace?connect=github${platformIdParam ? `&platform=${encodeURIComponent(platformIdParam)}` : ""}`}
      />
    </div>
  );
}
