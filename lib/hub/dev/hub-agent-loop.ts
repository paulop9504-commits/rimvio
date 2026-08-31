/**
 * Hub Agent Loop — Observe → Plan → Execute → Verify → Replan (Cursor-style).
 * Plan Executor delegates to hub-workspace-tools + existing deploy runtime hooks.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import {
  executeHubDeployTurn,
  planHubDeployTurn,
  type DeployExecutorCallbacks,
  type DeployWorkStep,
} from "@/lib/hub/deploy/hub-deploy-runtime";
import {
  invokeHubWorkspaceTool,
  type HubWorkspaceInspectResult,
  type HubWorkspaceToolContext,
  type HubWorkspaceToolId,
} from "@/lib/hub/dev/hub-workspace-tools";
import { planHubAgentTurn } from "@/lib/hub/dev/hub-agent-planner";
import { setPendingHubLoopResume, type HubDevConnectionId } from "@/lib/hub/dev/hub-connection-store";
import { evaluateToolApproval, approvalToLegacyPolicy } from "@/lib/agent/approval/approval-engine";
import { setPendingPublishApproval } from "@/lib/hub/dev/hub-publish-pending-store";
import type { PublishGateResult } from "@/lib/hub/dev/hub-publish-flow";
import {
  connectActionIdForProvider,
  connectActionLabelKo,
  providerLabel,
} from "@/lib/hub/dev/hub-connect-provider";
import { resumeUtteranceForProvider } from "@/lib/hub/dev/hub-oauth-connect";
import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";
import { planVerifyRepair } from "@/lib/hub/dev/hub-verify-repair";
import {
  CHECKPOINT_MUTATING_TOOLS,
  createHubCheckpoint,
} from "@/lib/hub/dev/hub-checkpoint-store";
import { observeFullWorkspace } from "@/lib/agent/hub-observation";
import { pathsForHubTool } from "@/lib/hub/dev/hub-file-tree";
import { AGENT_LOOP_LIMITS } from "@/lib/agent/loop/agent-state";
import { executionModeFromGoal, compilePlatformGoal, summarizePlatformGoal, type PlatformGoal } from "@/lib/hub/dev/platform-agent/platform-goal";
import { observeHubWorkspace } from "@/lib/hub/dev/hub-workspace-observe";
import { discoverPlatformContext } from "@/lib/hub/dev/platform-agent/context-discovery";
import { planPlatformChanges } from "@/lib/hub/dev/platform-agent/platform-planner";
import { buildCodingPlan } from "@/lib/hub/dev/platform-agent/coding-plan";
import { runCodingAgentLoop } from "@/lib/hub/dev/coding-agent/coding-agent-loop";
import { detectRegression } from "@/lib/hub/dev/hub-verify-repair";
import { inspectPreviewWithBrowser } from "@/lib/hub/dev/preview-agent-verify";
import { tickHubBackgroundAgent } from "@/lib/hub/dev/hub-background-agent";
import { runCursorStyleDeployPipeline } from "@/lib/hub/dev/hub-cursor-deploy-pipeline";
import { parseDeployTargetsFromUtterance, wantsDeployUtterance } from "@/lib/hub/dev/hub-deploy-targets";
import { rememberOperatorFocus } from "@/lib/hub/dev/conversation-memory";
import { getRepoSession } from "@/lib/hub/dev/coding-agent/repo-session";
import { snapshotVerifyResults, detectVerifyRegression, planRegressionRepair } from "@/lib/hub/dev/coding-agent/regression-repair";
import type { VerifyCommandResult } from "@/lib/hub/dev/coding-agent/verify-types";
import {
  initPlatformOrchestrator,
  advanceOrchestratorPhase,
  recordOrchestratorStepStart,
  recordOrchestratorStepResult,
  evaluateOrchestratorVerification,
  orchestratorPartialReplan,
  orchestratorWorkLog,
  type PlatformOrchestratorContext,
} from "@/lib/hub/dev/platform-agent/agent-orchestrator";
import {
  consumeAgentTurnInjections,
  consumeAgentTurnPause,
} from "@/lib/agent-os/agent-turn/interrupt";

export type HubAgentPlanStep = {
  readonly id: string;
  readonly label: string;
  readonly toolId: HubWorkspaceToolId;
  readonly args?: Record<string, unknown>;
};

export type HubAgentLoopPhase =
  | "observe"
  | "plan"
  | "execute"
  | "verify"
  | "replan"
  | "ask_user"
  | "complete";

export type HubAgentLoopEvent =
  | { readonly type: "phase"; readonly phase: HubAgentLoopPhase; readonly detail?: string }
  | { readonly type: "observe"; readonly lines: readonly string[] }
  | { readonly type: "plan"; readonly goal: string; readonly steps: readonly { label: string; status: "done" | "running" | "pending" }[] }
  | { readonly type: "tool"; readonly toolId: string; readonly label: string; readonly status: "running" | "done" | "failed"; readonly detail?: string }
  | { readonly type: "verify"; readonly ok: boolean; readonly detail: string }
  | { readonly type: "replan"; readonly reason: string }
  | { readonly type: "ask_user"; readonly message: string; readonly actionId: string; readonly actionLabel: string; readonly publishGate?: import("@/lib/hub/dev/hub-publish-flow").PublishGateResult }
  | { readonly type: "text"; readonly body: string }
  | { readonly type: "deploy_steps"; readonly steps: readonly DeployWorkStep[] }
  | { readonly type: "thought"; readonly title: string; readonly body?: string }
  | { readonly type: "terminal"; readonly title: string; readonly lines: readonly string[]; readonly waiting?: string | null }
  | { readonly type: "test_result"; readonly passed: number; readonly total: number; readonly running?: boolean }
  | { readonly type: "file_touch"; readonly paths: readonly string[]; readonly touch: "reading" | "modified" | "created" | "running" }
  | { readonly type: "complete"; readonly summary: string }
  | { readonly type: "orchestrator"; readonly workLog: string; readonly progressPct: number }
  | { readonly type: "final_report"; readonly report: import("@/lib/agent-os/agent-turn/types").AgentFinalReport };

export type HubAgentLoopInput = {
  readonly utterance: string;
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly executor: DeployExecutorCallbacks;
  readonly connections?: Readonly<Record<string, boolean>>;
  readonly stripeConnected?: boolean;
  readonly platformId?: string;
  readonly skipRuntimeIngress?: boolean;
  readonly userIntent?: import("@/lib/agent/conversation/intent-types").UserIntent;
  readonly platformGoal?: PlatformGoal;
  readonly onEvent: (event: HubAgentLoopEvent) => void;
  readonly maxReplan?: number;
  readonly modelId?: string | null;
  readonly conversationMemory?: import("@/lib/hub/dev/conversation-memory").OperatorConversationMemory | null;
};

export type HubAgentLoopResult = {
  readonly ok: boolean;
  readonly pausedForUser?: boolean;
  readonly actionId?: string;
  readonly snapshot: DevProjectSnapshot;
  readonly draft: PlatformDraft;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function wantsPayment(utterance: string): boolean {
  return /stripe|결제|payment|commerce/i.test(utterance);
}

function wantsBuild(utterance: string): boolean {
  return /만들|build|create|추가|platform|플랫폼|호텔|hotel/i.test(utterance);
}

function wantsDeploy(utterance: string): boolean {
  return /deploy|배포|publish|출시/i.test(utterance);
}

function toPlanningItems(
  steps: readonly HubAgentPlanStep[],
  activeIndex: number,
): { label: string; status: "done" | "running" | "pending" }[] {
  return steps.map((step, i) => ({
    label: step.label,
    status: i < activeIndex ? "done" : i === activeIndex ? "running" : "pending",
  }));
}

function buildCompletionSummary(platformGoal: PlatformGoal, testsPassed: boolean): string {
  if (!testsPassed) return "작업을 마쳤습니다. 남은 이슈를 확인해 주세요.";
  switch (platformGoal.goalKind) {
    case "create":
      return `${platformGoal.summaryKo} — Platform 생성 및 테스트 완료.`;
    case "modify":
      return `${platformGoal.summaryKo} — 수정 및 테스트 완료.`;
    case "connect":
      return "연결 준비가 완료되었습니다.";
    case "publish":
      return "Publish 준비가 완료되었습니다.";
    case "inspect":
      return `${platformGoal.summaryKo} — 분석 완료.`;
    default:
      return `${summarizePlatformGoal(platformGoal)} — 완료.`;
  }
}

function readInspectFromCtx(toolCtx: HubWorkspaceToolContext): HubWorkspaceInspectResult {
  const state = observeHubWorkspace({
    draft: toolCtx.getDraft(),
    snapshot: toolCtx.snapshot,
    connections: toolCtx.connections,
  });
  return { ...state, commerce: state.commerce };
}

export async function runHubAgentLoop(input: HubAgentLoopInput): Promise<HubAgentLoopResult> {
  const emit = input.onEvent;
  const maxReplan = input.maxReplan ?? AGENT_LOOP_LIMITS.MAX_REPLANS;
  let replans = 0;
  let repairBaselineDraft: PlatformDraft | null = null;
  let stripeConnected = input.stripeConnected ?? input.connections?.stripe ?? false;
  let testsPassed = input.snapshot.testsPassed === input.snapshot.testsTotal && input.snapshot.testsTotal > 0;

  const toolCtx: HubWorkspaceToolContext = {
    getDraft: () => input.executor.getDraft() as PlatformDraft,
    updateDraft: (patch) => input.executor.updateDraft(patch),
    snapshot: input.snapshot,
    executor: input.executor,
    connections: {
      github: input.connections?.github ?? false,
      openai: input.connections?.openai ?? false,
      stripe: stripeConnected,
      vercel: input.connections?.vercel ?? false,
      supabase: input.connections?.supabase ?? false,
      mcp: input.connections?.mcp ?? false,
    },
    repoRoot: getRepoSession(input.platformId ?? input.draft.id)?.root,
  };

  emit({ type: "phase", phase: "observe", detail: input.utterance });

  const platformId = input.platformId ?? input.draft.name ?? "dev";
  const bgTick = tickHubBackgroundAgent({
    platformId,
    draft: input.draft,
    metrics: {
      capabilityCount: input.draft.actions.length,
      failedTestRate:
        input.snapshot.testsTotal > 0
          ? 1 - input.snapshot.testsPassed / input.snapshot.testsTotal
          : 0,
      openImprovementTasks: 0,
    },
  });
  if (bgTick.tasksSpawned > 0) {
    emit({ type: "text", body: bgTick.workLogKo });
  }

  const platformGoal =
    input.platformGoal ??
    compilePlatformGoal({
      utterance: input.utterance,
      intent: input.userIntent ?? "modify",
      platformName: input.draft.name,
    });
  const executionMode = executionModeFromGoal(platformGoal);
  const skipFullInspect = executionMode === "code_direct";

  let orchestrator = initPlatformOrchestrator({ goal: platformGoal, maxReplans: maxReplan });
  orchestrator = advanceOrchestratorPhase(orchestrator, "observe", platformGoal.summaryKo);
  emit({
    type: "orchestrator",
    workLog: orchestratorWorkLog(orchestrator),
    progressPct: orchestrator.goalState.progressPct,
  });

  if (skipFullInspect) {
    emit({ type: "text", body: "코드 레벨 작업을 시작합니다." });
  } else {
    emit({ type: "text", body: "프로젝트를 확인하고 있습니다." });
  }

  let inspect: HubWorkspaceInspectResult & { observation?: ReturnType<typeof observeFullWorkspace> };

  if (skipFullInspect) {
    const discovery = discoverPlatformContext({
      goal: platformGoal,
      utterance: input.utterance,
      draft: toolCtx.getDraft(),
    });
    inspect = readInspectFromCtx(toolCtx);
    emit({ type: "observe", lines: discovery.lines });
  } else {
    const inspectResult = await invokeHubWorkspaceTool("workspace.inspect", {}, toolCtx);
    if (!inspectResult.ok) {
      emit({ type: "text", body: inspectResult.error });
      return { ok: false, snapshot: input.snapshot, draft: toolCtx.getDraft() };
    }
    inspect = inspectResult.data as HubWorkspaceInspectResult & {
      observation?: ReturnType<typeof observeFullWorkspace>;
    };
    const fullObs =
      inspect.observation ??
      observeFullWorkspace({
        draft: toolCtx.getDraft(),
        snapshot: input.snapshot,
        connections: toolCtx.connections,
      });
    emit({ type: "observe", lines: fullObs.lines });
  }

  if (wantsDeployUtterance(input.utterance) && !wantsPayment(input.utterance) && !wantsBuild(input.utterance)) {
    const targets = parseDeployTargetsFromUtterance(input.utterance);
    if (targets.length === 0) {
      emit({
        type: "ask_user",
        message: "어디에 배포할까요? 본인 Preview와 우리쪽 Main을 골라 주세요.",
        actionId: "choose_deploy_targets",
        actionLabel: "배포 시작",
      });
      return {
        ok: true,
        pausedForUser: true,
        actionId: "choose_deploy_targets",
        snapshot: buildProjectSnapshot({ draft: toolCtx.getDraft(), testsPassed }),
        draft: toolCtx.getDraft(),
      };
    }
    return runCursorStyleDeployPipeline({
      utterance: input.utterance,
      targets,
      toolCtx,
      platformId: input.platformId,
      onEvent: emit,
    });
  }

  const structuredPlan = await planHubAgentTurn({
    utterance: input.utterance,
    inspect,
    stripeConnected,
    platformId: input.platformId ?? input.draft.id,
    skipRuntime: input.skipRuntimeIngress,
    userIntent: input.userIntent,
    draft: toolCtx.getDraft(),
    modelId: input.modelId,
    memory: input.conversationMemory,
  });

  if (structuredPlan.source === "llm") {
    emit({
      type: "thought",
      title: structuredPlan.modelId ? `${structuredPlan.modelId} 플랜` : "LLM 플랜",
      body: structuredPlan.goalKo ?? structuredPlan.goal,
    });
  }

  rememberOperatorFocus(input.platformId ?? input.draft.id, {
    goal: structuredPlan.goalKo ?? structuredPlan.goal,
    task: structuredPlan.steps[0]?.label ?? null,
    utterance: input.utterance,
    workInProgress: true,
    capabilities: inspect.capabilities.slice(0, 8),
  });

  let planSteps = [...structuredPlan.steps];
  orchestrator = initPlatformOrchestrator({ goal: platformGoal, planSteps, maxReplans: maxReplan });
  orchestrator = advanceOrchestratorPhase(orchestrator, "plan", structuredPlan.strategy);
  emit({
    type: "orchestrator",
    workLog: orchestratorWorkLog(orchestrator),
    progressPct: orchestrator.goalState.progressPct,
  });
  if (structuredPlan.intentSummaryKo) {
    emit({ type: "text", body: structuredPlan.intentSummaryKo });
  }
  emit({ type: "phase", phase: "plan", detail: structuredPlan.strategy });
  emit({
    type: "plan",
    goal: summarizePlatformGoal(platformGoal),
    steps: toPlanningItems(planSteps, 0),
  });

  if (executionMode === "code_direct") {
    const discovery = discoverPlatformContext({
      goal: platformGoal,
      utterance: input.utterance,
      draft: toolCtx.getDraft(),
    });
    const platformPlan = planPlatformChanges({
      goal: platformGoal,
      discovery,
      draft: toolCtx.getDraft(),
      stripeConnected,
    });
    const codingPlan = buildCodingPlan({
      platformPlan,
      discovery,
    });

    emit({ type: "text", body: codingPlan.summaryKo });
    const codingResult = await runCodingAgentLoop({
      plan: codingPlan,
      ctx: toolCtx,
      onEvent: (event) => {
        if (event.type === "phase") {
          emit({ type: "phase", phase: "execute", detail: event.detail });
        }
        if (event.type === "file") {
          emit({
            type: "file_touch",
            paths: event.path ? [event.path] : [],
            touch: event.action === "read" ? "reading" : "modified",
          });
        }
        if (event.type === "test") {
          testsPassed = event.ok;
          emit({ type: "test_result", passed: event.passed, total: event.total, running: false });
          emit({ type: "verify", ok: event.ok, detail: `${event.passed}/${event.total} passed` });
        }
        if (event.type === "repair") {
          emit({ type: "replan", reason: event.reason });
        }
        if (event.type === "complete") {
          emit({ type: "text", body: event.summary });
        }
      },
    });

    const finalDraft = toolCtx.getDraft();
    const finalSnapshot = buildProjectSnapshot({ draft: finalDraft, testsPassed });
    const summary = buildCompletionSummary(platformGoal, codingResult.ok);
    emit({ type: "phase", phase: "complete" });
    emit({ type: "complete", summary });
    return { ok: codingResult.ok, snapshot: finalSnapshot, draft: finalDraft };
  }

  // Delegate pure build utterances to existing deploy runtime when appropriate
  if (!wantsPayment(input.utterance) && wantsBuild(input.utterance) && !wantsDeploy(input.utterance)) {
    const ctx = {
      mode: "platform" as const,
      draft: toolCtx.getDraft(),
      testsPassed,
    };
    const deployPlan = planHubDeployTurn(input.utterance, ctx);
    if (deployPlan.workSteps.length > 0) {
      emit({ type: "text", body: deployPlan.messages.find((m) => m.role === "agent")?.content ?? "작업을 시작합니다." });
      await executeHubDeployTurn(deployPlan, input.executor, (steps) => {
        emit({ type: "deploy_steps", steps });
      });
      const draft = toolCtx.getDraft();
      const snapshot = buildProjectSnapshot({ draft, testsPassed });
      emit({ type: "complete", summary: "Workspace Patch가 적용되었습니다." });
      return { ok: true, snapshot, draft };
    }
  }

  let stepIndex = 0;
  const sessionKey = input.platformId ?? input.draft.id;
  while (stepIndex < planSteps.length) {
    if (consumeAgentTurnPause(sessionKey)) {
      emit({ type: "text", body: "요청하신 대로 여기서 멈췄어요. 이어서 진행할 때 말씀해 주세요." });
      emit({ type: "phase", phase: "ask_user" });
      return {
        ok: false,
        pausedForUser: true,
        snapshot: buildProjectSnapshot({ draft: toolCtx.getDraft(), testsPassed }),
        draft: toolCtx.getDraft(),
      };
    }
    const injected = consumeAgentTurnInjections(sessionKey);
    if (injected.length > 0) {
      emit({ type: "replan", reason: `요청을 반영합니다: ${injected.join(", ")}` });
      planSteps = [
        ...planSteps.slice(0, stepIndex),
        {
          id: `inject-${stepIndex}`,
          label: injected.join(" · "),
          toolId: "resource.apply",
          args: { utterance: injected.join(" ") },
        },
        ...planSteps.slice(stepIndex),
      ];
    }
    const step = planSteps[stepIndex]!;
    emit({ type: "phase", phase: "execute", detail: step.label });
    emit({
      type: "plan",
      goal: input.utterance.trim(),
      steps: toPlanningItems(planSteps, stepIndex),
    });
    emit({ type: "tool", toolId: step.toolId, label: step.label, status: "running" });
    orchestrator = recordOrchestratorStepStart(orchestrator, step);
    emit({
      type: "orchestrator",
      workLog: orchestratorWorkLog(orchestrator),
      progressPct: orchestrator.goalState.progressPct,
    });

    const approval = evaluateToolApproval({
      toolId: step.toolId,
      publish: step.args?.publish === true || step.toolId === "publish.request",
    });
    const policy = approvalToLegacyPolicy(approval.decision);

    if (policy === "require_approval" && step.toolId === "publish.request") {
      await sleep(80);
      const gateResult = await invokeHubWorkspaceTool(step.toolId, step.args ?? {}, toolCtx);
      const gate = (gateResult.ok ? gateResult.data : null) as PublishGateResult | null;
      if (gate && !gate.ok) {
        emit({
          type: "tool",
          toolId: step.toolId,
          label: step.label,
          status: "failed",
          detail: gate.errorKo,
        });
        emit({ type: "verify", ok: false, detail: gate.errorKo ?? "Publish gate blocked" });
        return {
          ok: false,
          snapshot: buildProjectSnapshot({ draft: toolCtx.getDraft(), testsPassed }),
          draft: toolCtx.getDraft(),
        };
      }
      emit({
        type: "tool",
        toolId: step.toolId,
        label: step.label,
        status: "done",
        detail: gate ? `${gate.registeredCount} caps · v2 gate pass` : undefined,
      });
      emit({
        type: "ask_user",
        message: "Capability Index v2 검증 완료 — Production Publish 승인이 필요합니다.",
        actionId: "approve_publish",
        actionLabel: "Publish 승인",
        publishGate: gate ?? undefined,
      });
      setPendingPublishApproval({
        platformId: input.platformId ?? toolCtx.getDraft().id,
        utterance: input.utterance,
        gate: gate ?? {
          ok: true,
          manifestValid: true,
          testsPassed,
          registeredCount: 0,
          rejected: [],
          platformId: toolCtx.getDraft().id,
          platformName: toolCtx.getDraft().name,
        },
      });
      return {
        ok: false,
        pausedForUser: true,
        actionId: "approve_publish",
        snapshot: buildProjectSnapshot({ draft: toolCtx.getDraft(), testsPassed }),
        draft: toolCtx.getDraft(),
      };
    }

    if (policy === "require_approval" && step.toolId === "deploy.prepare") {
      emit({
        type: "ask_user",
        message: "Production Publish 전 최종 승인이 필요합니다.",
        actionId: "approve_publish",
        actionLabel: "Publish 승인",
      });
      return {
        ok: false,
        pausedForUser: true,
        actionId: "approve_publish",
        snapshot: buildProjectSnapshot({ draft: toolCtx.getDraft(), testsPassed }),
        draft: toolCtx.getDraft(),
      };
    }

    const touchPaths = pathsForHubTool(step.toolId, step.args ?? {}, toolCtx.getDraft());
    if (touchPaths.length) {
      emit({
        type: "file_touch",
        paths: touchPaths,
        touch: step.toolId === "file.read" ? "reading" : "running",
      });
    }

    if (step.toolId === "test.run") {
      emit({
        type: "test_result",
        passed: toolCtx.snapshot.testsPassed,
        total: toolCtx.snapshot.testsTotal,
        running: true,
      });
    }

    await sleep(120);

    if (CHECKPOINT_MUTATING_TOOLS.has(step.toolId)) {
      createHubCheckpoint({
        platformId: input.platformId ?? toolCtx.getDraft().id,
        label: step.label,
        draft: toolCtx.getDraft(),
      });
    }

    const result = await invokeHubWorkspaceTool(step.toolId, step.args ?? {}, toolCtx);

    if (step.toolId === "connection.connect" && result.ok) {
      const provider = String(step.args?.provider ?? "stripe") as HubPlatformProviderId;
      const actionId = connectActionIdForProvider(provider);
      const label = providerLabel(provider);
      emit({
        type: "tool",
        toolId: step.toolId,
        label: step.label,
        status: "done",
        detail: `${label} OAuth required`,
      });
      emit({
        type: "ask_user",
        message: `${label} OAuth 로그인이 필요해요.`,
        actionId,
        actionLabel: connectActionLabelKo(provider),
      });
      setPendingHubLoopResume({
        utterance: input.utterance,
        platformId: input.platformId ?? input.draft.id ?? null,
        actionId,
        provider: provider as HubDevConnectionId,
      });
      return {
        ok: false,
        pausedForUser: true,
        actionId,
        snapshot: buildProjectSnapshot({ draft: toolCtx.getDraft(), testsPassed }),
        draft: toolCtx.getDraft(),
      };
    }

    if (!result.ok) {
      orchestrator = recordOrchestratorStepResult(orchestrator, step, false, result.error);
      emit({
        type: "orchestrator",
        workLog: orchestratorWorkLog(orchestrator),
        progressPct: orchestrator.goalState.progressPct,
      });
      emit({
        type: "tool",
        toolId: step.toolId,
        label: step.label,
        status: "failed",
        detail: result.error,
      });
      emit({ type: "verify", ok: false, detail: result.error });
      if (replans < maxReplan) {
        replans += 1;
        repairBaselineDraft = toolCtx.getDraft();
        const repairPlan = planVerifyRepair({
          draft: repairBaselineDraft,
          toolError: result.error,
        });
        orchestrator = orchestratorPartialReplan(orchestrator, {
          failedStepId: step.id,
          repairSteps: repairPlan.repairSteps,
          reasonKo: repairPlan.summaryKo,
        });
        emit({
          type: "orchestrator",
          workLog: orchestratorWorkLog(orchestrator),
          progressPct: orchestrator.goalState.progressPct,
        });
        emit({ type: "replan", reason: repairPlan.summaryKo });
        planSteps = [
          ...planSteps.slice(0, stepIndex),
          ...repairPlan.repairSteps,
        ];
        stepIndex = planSteps.findIndex((s) => s.id.startsWith("repair_"));
        if (stepIndex < 0) {
          stepIndex = Math.max(0, planSteps.length - repairPlan.repairSteps.length);
        }
        continue;
      }
      return {
        ok: false,
        snapshot: buildProjectSnapshot({ draft: toolCtx.getDraft(), testsPassed }),
        draft: toolCtx.getDraft(),
      };
    }

    emit({
      type: "tool",
      toolId: step.toolId,
      label: step.label,
      status: "done",
      detail: JSON.stringify(result.data).slice(0, 80),
    });
    orchestrator = recordOrchestratorStepResult(
      orchestrator,
      step,
      true,
      step.label,
    );
    emit({
      type: "orchestrator",
      workLog: orchestratorWorkLog(orchestrator),
      progressPct: orchestrator.goalState.progressPct,
    });

    if (touchPaths.length) {
      emit({
        type: "file_touch",
        paths: touchPaths,
        touch: step.toolId === "capability.create" ? "created" : "modified",
      });
    }

    if (step.toolId === "preview.run") {
      const { verify: previewVerify } = await inspectPreviewWithBrowser(toolCtx.getDraft());
      emit({ type: "phase", phase: "verify", detail: "Preview agent verification" });
      emit({
        type: "verify",
        ok: previewVerify.ok,
        detail: previewVerify.summaryKo,
      });
      if (!previewVerify.ok && replans < maxReplan) {
        replans += 1;
        repairBaselineDraft = toolCtx.getDraft();
        const repairPlan = planVerifyRepair({
          draft: repairBaselineDraft,
          previewFailed: true,
        });
        emit({ type: "replan", reason: repairPlan.summaryKo });
        planSteps = [
          ...planSteps.slice(0, stepIndex + 1),
          ...repairPlan.repairSteps.filter((s) => s.toolId !== "test.run"),
        ];
        stepIndex += 1;
        continue;
      }
    }

    if (step.toolId === "code.createFile" || step.toolId === "code.modifyFile" || step.toolId === "code.deleteFile") {
      const path = String((result.data as { path?: string } | undefined)?.path ?? step.args?.path ?? "");
      if (path) {
        rememberOperatorFocus(input.platformId ?? input.draft.id, {
          files: [path],
          objects: [path],
          workInProgress: true,
        });
      }
    }

    if (
      step.toolId === "test.run" ||
      step.toolId === "test.e2e" ||
      step.toolId === "lint.run" ||
      step.toolId === "typecheck.run"
    ) {
      const data = result.data as {
        passed?: number;
        total?: number;
        ok?: boolean;
        kind?: string;
        skipped?: boolean;
        stdout?: string;
        stderr?: string;
        command?: string;
      };
      const ok = data.ok !== false;
      testsPassed = step.toolId === "test.run" ? ok : testsPassed;
      if (step.toolId === "test.run") {
        emit({
          type: "test_result",
          passed: data.passed ?? (ok ? 1 : 0),
          total: data.total ?? 1,
          running: false,
        });
      }
      emit({ type: "phase", phase: "verify" });
      emit({
        type: "verify",
        ok,
        detail:
          data.command
            ? `${data.command}${data.skipped ? " (skipped)" : ok ? " ok" : " failed"}`
            : `${data.passed ?? 0}/${data.total ?? 0} passed`,
      });
      if (data.stdout || data.stderr) {
        emit({
          type: "terminal",
          title: data.command ?? step.label,
          lines: `${data.stdout ?? ""}\n${data.stderr ?? ""}`.split("\n").filter(Boolean).slice(0, 24),
        });
      }

      const snapshot = snapshotVerifyResults([
        {
          kind: (data.kind as VerifyCommandResult["kind"]) ?? "unit",
          ok,
          command: data.command ?? step.toolId,
          exitCode: ok ? 0 : 1,
          stdout: data.stdout ?? "",
          stderr: data.stderr ?? "",
          skipped: data.skipped,
        },
      ]);

      if (!ok && replans < maxReplan) {
        replans += 1;
        const regression = detectVerifyRegression(null, snapshot);
        const repair = planRegressionRepair({ after: snapshot, newFailures: regression.newFailures });
        emit({ type: "replan", reason: repair.summaryKo });
        planSteps = [...planSteps.slice(0, stepIndex + 1), ...repair.steps];
        stepIndex += 1;
        continue;
      }

      if (step.toolId !== "test.run") {
        stepIndex += 1;
        continue;
      }

      const verdict = evaluateOrchestratorVerification(
        orchestrator,
        ok,
        data.command ?? `${data.passed ?? 0}/${data.total ?? 0} passed`,
      );
      orchestrator = verdict.ctx;
      emit({
        type: "orchestrator",
        workLog: orchestratorWorkLog(orchestrator),
        progressPct: orchestrator.goalState.progressPct,
      });

      if (!ok && replans < maxReplan) {
        replans += 1;
        repairBaselineDraft = toolCtx.getDraft();
        const repairPlan = planVerifyRepair({
          draft: repairBaselineDraft,
          testFailed: true,
          testDetail: `${data.passed ?? 0}/${data.total ?? 0} passed`,
        });
        emit({ type: "replan", reason: repairPlan.summaryKo });
        orchestrator = orchestratorPartialReplan(orchestrator, {
          failedStepId: step.id,
          repairSteps: repairPlan.repairSteps,
          reasonKo: repairPlan.summaryKo,
        });
        emit({ type: "text", body: "테스트 실패를 확인했습니다. Issue graph 기반으로 수정합니다." });
        planSteps = [
          ...planSteps.slice(0, stepIndex + 1),
          ...repairPlan.repairSteps,
        ];
        stepIndex += 1;
        continue;
      }

      if (ok && repairBaselineDraft) {
        const regression = detectRegression(repairBaselineDraft, toolCtx.getDraft());
        if (regression.detected) {
          emit({ type: "text", body: regression.summaryKo });
        }
        repairBaselineDraft = null;
      }

      stepIndex += 1;
      continue;
    }

    stepIndex += 1;
  }

  emit({ type: "phase", phase: "complete" });
  rememberOperatorFocus(input.platformId ?? input.draft.id, { workInProgress: false });
  const finalDraft = toolCtx.getDraft();
  const finalSnapshot = buildProjectSnapshot({ draft: finalDraft, testsPassed });
  const summary = buildCompletionSummary(platformGoal, testsPassed);
  emit({ type: "complete", summary });
  emit({ type: "text", body: summary });

  return { ok: testsPassed, snapshot: finalSnapshot, draft: finalDraft };
}

/** Resume loop after user completes an external action (OAuth / publish approval). */
export async function resumeHubAgentLoop(
  input: HubAgentLoopInput & {
    readonly resumeUtterance?: string;
    readonly resumeProvider?: HubPlatformProviderId;
  },
): Promise<HubAgentLoopResult> {
  const provider = input.resumeProvider ?? "stripe";
  const connections = {
    ...input.connections,
    [provider]: true,
  };
  return runHubAgentLoop({
    ...input,
    utterance:
      input.resumeUtterance ??
      resumeUtteranceForProvider(provider),
    stripeConnected: provider === "stripe" ? true : input.stripeConnected,
    connections,
  });
}
