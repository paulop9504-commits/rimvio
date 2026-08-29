/**
 * Hub Agent Controller — Workspace UI ingress.
 *
 * WorkspacePrompt → IntentGate → (chat | Agent Loop → Plan Executor → Tool Gateway)
 */

import { runIntentGate, type AgentIntent } from "@/lib/agent/intent/intent-gate";
import { runHubAgentLoop, type HubAgentLoopEvent, type HubAgentLoopInput, type HubAgentLoopResult } from "@/lib/hub/dev/hub-agent-loop";
import { invokeHubWorkspaceTool, observationFromInspect, type HubWorkspaceInspectResult, type HubWorkspaceToolContext } from "@/lib/hub/dev/hub-workspace-tools";
import { createInitialAgentState, shouldStopLoop, type AgentState } from "@/lib/agent/loop/agent-state";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";

export type HubAgentControllerEvent =
  | { readonly type: "intent"; readonly intent: AgentIntent; readonly executable: boolean }
  | { readonly type: "conversational"; readonly body: string }
  | HubAgentLoopEvent;

export type HubAgentControllerInput = Omit<HubAgentLoopInput, "onEvent"> & {
  readonly onEvent: (event: HubAgentControllerEvent) => void;
  /** Ignored — execution always starts from current utterance only. */
  readonly staleGoal?: string | null;
};

export type HubAgentControllerResult = HubAgentLoopResult & {
  readonly executionStarted: boolean;
  readonly toolCalls: number;
  readonly intent: AgentIntent;
  readonly conversational: boolean;
};

function buildToolCtx(input: HubAgentControllerInput, stripeConnected: boolean): HubWorkspaceToolContext {
  return {
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
}

async function runTestOnly(input: HubAgentControllerInput): Promise<HubAgentControllerResult> {
  const emit = input.onEvent;
  const stripeConnected = input.stripeConnected ?? input.connections?.stripe ?? false;
  const toolCtx = buildToolCtx(input, stripeConnected);

  emit({ type: "intent", intent: "test", executable: true });
  emit({ type: "text", body: "Sandbox 테스트를 실행합니다." });
  emit({ type: "test_result", passed: input.snapshot.testsPassed, total: input.snapshot.testsTotal, running: true });

  const result = await invokeHubWorkspaceTool("test.run", {}, toolCtx);
  const toolCalls = 1;

  if (!result.ok) {
    emit({ type: "text", body: result.error });
    return {
      ok: false,
      executionStarted: true,
      toolCalls,
      intent: "test",
      conversational: false,
      snapshot: input.snapshot,
      draft: toolCtx.getDraft(),
    };
  }

  const data = result.data as { passed: number; total: number; ok: boolean };
  emit({ type: "test_result", passed: data.passed, total: data.total, running: false });
  emit({ type: "verify", ok: data.ok, detail: `${data.passed}/${data.total} passed` });
  emit({ type: "complete", summary: data.ok ? "테스트가 통과했습니다." : "테스트 실패 — 수정이 필요합니다." });

  return {
    ok: data.ok,
    executionStarted: true,
    toolCalls,
    intent: "test",
    conversational: false,
    snapshot: buildProjectSnapshot({ draft: toolCtx.getDraft(), testsPassed: data.ok }),
    draft: toolCtx.getDraft(),
  };
}

async function runConnectOnly(input: HubAgentControllerInput): Promise<HubAgentControllerResult> {
  const emit = input.onEvent;
  const stripeConnected = input.stripeConnected ?? input.connections?.stripe ?? false;
  const toolCtx = buildToolCtx(input, stripeConnected);

  emit({ type: "intent", intent: "connect", executable: true });
  emit({ type: "text", body: "연결 상태를 확인합니다." });

  await invokeHubWorkspaceTool("connection.list", {}, toolCtx);
  const toolCalls = 2;

  if (stripeConnected) {
    emit({ type: "text", body: "Stripe가 이미 연결되어 있습니다." });
    emit({ type: "complete", summary: "Stripe 연결됨" });
    return {
      ok: true,
      executionStarted: true,
      toolCalls: 1,
      intent: "connect",
      conversational: false,
      snapshot: input.snapshot,
      draft: toolCtx.getDraft(),
    };
  }

  await invokeHubWorkspaceTool("connection.connect", { provider: "stripe" }, toolCtx);
  emit({
    type: "ask_user",
    message: "Stripe 연결이 필요합니다.",
    actionId: "connect_stripe",
    actionLabel: "Connect Stripe",
  });

  return {
    ok: false,
    pausedForUser: true,
    actionId: "connect_stripe",
    executionStarted: true,
    toolCalls,
    intent: "connect",
    conversational: false,
    snapshot: input.snapshot,
    draft: toolCtx.getDraft(),
  };
}

async function runInspectOnly(input: HubAgentControllerInput, _state: AgentState): Promise<HubAgentControllerResult> {
  const emit = input.onEvent;
  const stripeConnected = input.stripeConnected ?? input.connections?.stripe ?? false;
  const toolCtx = buildToolCtx(input, stripeConnected);

  emit({ type: "intent", intent: "inspect", executable: true });
  emit({ type: "phase", phase: "observe", detail: input.utterance });
  emit({ type: "text", body: "Workspace 상태를 확인합니다." });

  const inspectResult = await invokeHubWorkspaceTool("workspace.inspect", {}, toolCtx);
  const toolCalls = inspectResult.ok ? 1 : 0;

  if (!inspectResult.ok) {
    emit({ type: "text", body: inspectResult.error });
    return {
      ok: false,
      executionStarted: true,
      toolCalls,
      intent: "inspect",
      conversational: false,
      snapshot: input.snapshot,
      draft: toolCtx.getDraft(),
    };
  }

  const inspect = inspectResult.data as HubWorkspaceInspectResult;
  emit({ type: "observe", lines: observationFromInspect(inspect) });
  emit({ type: "complete", summary: "현재 Workspace 상태입니다." });
  emit({ type: "text", body: "추가 작업이 필요하면 말씀해 주세요." });

  return {
    ok: true,
    executionStarted: true,
    toolCalls,
    intent: "inspect",
    conversational: false,
    snapshot: buildProjectSnapshot({ draft: toolCtx.getDraft() }),
    draft: toolCtx.getDraft(),
  };
}

/**
 * Single ingress for Hub Platform Operator prompts.
 * Does not inherit stale workspace goals — only `utterance` drives execution.
 */
export async function runHubAgentController(
  input: HubAgentControllerInput,
): Promise<HubAgentControllerResult> {
  const emit = input.onEvent;
  const utterance = input.utterance.trim();

  const gate = runIntentGate({
    utterance,
    context: {
      staleGoal: input.staleGoal ?? null,
      platformName: input.draft.name,
    },
  });

  emit({ type: "intent", intent: gate.intent, executable: gate.executable });

  if (gate.conversational) {
    emit({ type: "conversational", body: gate.responseKo ?? "" });
    return {
      ok: true,
      executionStarted: false,
      toolCalls: 0,
      intent: gate.intent,
      conversational: true,
      snapshot: input.snapshot,
      draft: input.draft,
    };
  }

  const agentState = createInitialAgentState({ goal: utterance, intent: gate.intent });

  if (shouldStopLoop(agentState)) {
    emit({ type: "text", body: "실행 한도에 도달했습니다. 새 요청으로 다시 시작해 주세요." });
    return {
      ok: false,
      executionStarted: false,
      toolCalls: 0,
      intent: gate.intent,
      conversational: false,
      snapshot: input.snapshot,
      draft: input.draft,
    };
  }

  if (gate.intent === "inspect") {
    return runInspectOnly(input, agentState);
  }

  if (gate.intent === "test") {
    return runTestOnly(input);
  }

  if (gate.intent === "connect") {
    return runConnectOnly(input);
  }

  let toolCalls = 0;
  const loopResult = await runHubAgentLoop({
    ...input,
    utterance,
    onEvent: (event) => {
      if (event.type === "tool" && event.status === "running") {
        toolCalls += 1;
      }
      emit(event);
    },
  });

  return {
    ...loopResult,
    executionStarted: true,
    toolCalls,
    intent: gate.intent,
    conversational: false,
  };
}

/** Resume after external action — requires explicit resume utterance (not stale goal). */
export async function resumeHubAgentController(
  input: HubAgentControllerInput & { readonly resumeUtterance?: string },
): Promise<HubAgentControllerResult> {
  return runHubAgentController({
    ...input,
    utterance: input.resumeUtterance ?? "Stripe 연결 완료 — 이어서 진행",
    stripeConnected: true,
    connections: { ...input.connections, stripe: true },
  });
}
