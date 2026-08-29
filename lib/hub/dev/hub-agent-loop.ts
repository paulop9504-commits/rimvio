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
  observationFromInspect,
  type HubWorkspaceInspectResult,
  type HubWorkspaceToolContext,
  type HubWorkspaceToolId,
} from "@/lib/hub/dev/hub-workspace-tools";
import { planHubAgentTurn } from "@/lib/hub/dev/hub-agent-planner";
import { setPendingHubLoopResume } from "@/lib/hub/dev/hub-connection-store";

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
  | { readonly type: "ask_user"; readonly message: string; readonly actionId: string; readonly actionLabel: string }
  | { readonly type: "text"; readonly body: string }
  | { readonly type: "deploy_steps"; readonly steps: readonly DeployWorkStep[] }
  | { readonly type: "test_result"; readonly passed: number; readonly total: number; readonly running?: boolean }
  | { readonly type: "complete"; readonly summary: string };

export type HubAgentLoopInput = {
  readonly utterance: string;
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly executor: DeployExecutorCallbacks;
  readonly connections?: Readonly<Record<string, boolean>>;
  readonly stripeConnected?: boolean;
  readonly platformId?: string;
  readonly skipRuntimeIngress?: boolean;
  readonly onEvent: (event: HubAgentLoopEvent) => void;
  readonly maxReplan?: number;
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

export async function runHubAgentLoop(input: HubAgentLoopInput): Promise<HubAgentLoopResult> {
  const emit = input.onEvent;
  const maxReplan = input.maxReplan ?? 2;
  let replans = 0;
  let stripeConnected = input.stripeConnected ?? input.connections?.stripe ?? false;
  let testsPassed = input.snapshot.testsPassed === input.snapshot.testsTotal && input.snapshot.testsTotal > 0;

  const toolCtx: HubWorkspaceToolContext = {
    getDraft: () => input.executor.getDraft() as PlatformDraft,
    updateDraft: (patch) => input.executor.updateDraft(patch),
    snapshot: input.snapshot,
    executor: input.executor,
    connections: {
      github: true,
      openai: true,
      stripe: stripeConnected,
      mcp: false,
      ...input.connections,
    },
  };

  emit({ type: "phase", phase: "observe", detail: input.utterance });
  emit({ type: "text", body: "프로젝트를 확인하고 있습니다." });

  const inspectResult = await invokeHubWorkspaceTool("workspace.inspect", {}, toolCtx);
  if (!inspectResult.ok) {
    emit({ type: "text", body: inspectResult.error });
    return { ok: false, snapshot: input.snapshot, draft: toolCtx.getDraft() };
  }

  const inspect = inspectResult.data as HubWorkspaceInspectResult;
  const observeLines = observationFromInspect(inspect);
  emit({ type: "observe", lines: observeLines });

  const structuredPlan = await planHubAgentTurn({
    utterance: input.utterance,
    inspect,
    stripeConnected,
    platformId: input.platformId ?? input.draft.id,
    skipRuntime: input.skipRuntimeIngress,
  });

  let planSteps = [...structuredPlan.steps];
  if (structuredPlan.goalKo) {
    emit({ type: "text", body: structuredPlan.goalKo });
  }
  emit({ type: "phase", phase: "plan", detail: structuredPlan.strategy });
  emit({
    type: "plan",
    goal: input.utterance.trim(),
    steps: toPlanningItems(planSteps, 0),
  });

  // Delegate pure build/deploy utterances to existing deploy runtime when appropriate
  if (!wantsPayment(input.utterance) && (wantsBuild(input.utterance) || wantsDeploy(input.utterance))) {
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
  while (stepIndex < planSteps.length) {
    const step = planSteps[stepIndex]!;
    emit({ type: "phase", phase: "execute", detail: step.label });
    emit({
      type: "plan",
      goal: input.utterance.trim(),
      steps: toPlanningItems(planSteps, stepIndex),
    });
    emit({ type: "tool", toolId: step.toolId, label: step.label, status: "running" });

    if (step.toolId === "test.run") {
      emit({
        type: "test_result",
        passed: toolCtx.snapshot.testsPassed,
        total: toolCtx.snapshot.testsTotal,
        running: true,
      });
    }

    await sleep(120);

    const result = await invokeHubWorkspaceTool(step.toolId, step.args ?? {}, toolCtx);

    if (step.id === "ask_stripe" && result.ok) {
      emit({
        type: "tool",
        toolId: step.toolId,
        label: step.label,
        status: "done",
        detail: "Stripe OAuth required",
      });
      emit({
        type: "ask_user",
        message: "Stripe 연결이 필요합니다.",
        actionId: "connect_stripe",
        actionLabel: "Connect Stripe",
      });
      setPendingHubLoopResume({
        utterance: input.utterance,
        platformId: input.platformId ?? input.draft.id ?? null,
        actionId: "connect_stripe",
      });
      return {
        ok: false,
        pausedForUser: true,
        actionId: "connect_stripe",
        snapshot: buildProjectSnapshot({ draft: toolCtx.getDraft(), testsPassed }),
        draft: toolCtx.getDraft(),
      };
    }

    if (!result.ok) {
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
        emit({ type: "replan", reason: result.error });
        planSteps = [
          ...planSteps.slice(0, stepIndex),
          { id: "fix", label: "실패 수정", toolId: "schema.update", args: { capability: "payment.commit", fixApprovalToken: true } },
          { id: "retest", label: "테스트 재실행", toolId: "test.run" },
        ];
        stepIndex = planSteps.findIndex((s) => s.id === "fix");
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

    if (step.toolId === "test.run") {
      const data = result.data as { passed: number; total: number; ok: boolean };
      testsPassed = data.ok;
      emit({ type: "test_result", passed: data.passed, total: data.total, running: false });
      emit({ type: "phase", phase: "verify" });
      emit({
        type: "verify",
        ok: data.ok,
        detail: `${data.passed}/${data.total} passed`,
      });

      if (!data.ok && replans < maxReplan) {
        replans += 1;
        emit({ type: "replan", reason: "payment.commit 테스트 실패 — approvalToken 누락" });
        emit({ type: "text", body: "테스트 실패를 확인했습니다. 수정 후 다시 실행합니다." });
        planSteps = [
          ...planSteps.slice(0, stepIndex + 1),
          { id: "fix_commit", label: "payment.commit 스키마 수정", toolId: "schema.update", args: { capability: "payment.commit", fixApprovalToken: true } },
          { id: "retest", label: "테스트 재실행", toolId: "test.run" },
        ];
        stepIndex += 1;
        continue;
      }
    }

    stepIndex += 1;
  }

  emit({ type: "phase", phase: "complete" });
  const finalDraft = toolCtx.getDraft();
  const finalSnapshot = buildProjectSnapshot({ draft: finalDraft, testsPassed });
  const summary = testsPassed
    ? "Stripe 결제 기능 구현 및 테스트가 완료되었습니다. Publish 준비가 되었습니다."
    : "작업을 마쳤습니다. 남은 이슈를 확인해 주세요.";
  emit({ type: "complete", summary });
  emit({ type: "text", body: summary });

  return { ok: testsPassed, snapshot: finalSnapshot, draft: finalDraft };
}

/** Resume loop after user completes an external action (e.g. Stripe OAuth). */
export async function resumeHubAgentLoop(
  input: HubAgentLoopInput & { readonly resumeUtterance?: string },
): Promise<HubAgentLoopResult> {
  return runHubAgentLoop({
    ...input,
    utterance: input.resumeUtterance ?? "Stripe 연결 완료 — 결제 capability 이어서 진행",
    stripeConnected: true,
    connections: { ...input.connections, stripe: true },
  });
}
