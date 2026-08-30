/**
 * Hub Agent Controller — Workspace UI ingress.
 *
 * WorkspacePrompt → IntentGate → (chat | Agent Loop → Plan Executor → Tool Gateway)
 */

import { runConversationGate, type UserIntent } from "@/lib/agent/conversation";
import {
  readOperatorMemory,
  rememberOperatorFocus,
  resolveOperatorTurn,
} from "@/lib/hub/dev/conversation-memory";
import { runHubAgentLoop, type HubAgentLoopEvent, type HubAgentLoopInput, type HubAgentLoopResult } from "@/lib/hub/dev/hub-agent-loop";
import { observeFullWorkspace } from "@/lib/agent/hub-observation";
import { invokeHubWorkspaceTool, type HubWorkspaceInspectResult, type HubWorkspaceToolContext } from "@/lib/hub/dev/hub-workspace-tools";
import { createInitialAgentState, shouldStopLoop, type AgentState } from "@/lib/agent/loop/agent-state";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";
import { resumeUtteranceForProvider } from "@/lib/hub/dev/hub-oauth-connect";
import {
  connectActionIdForProvider,
  connectActionLabelKo,
  providerLabel,
  resolveConnectProviderFromUtterance,
} from "@/lib/hub/dev/hub-connect-provider";
import type { HubPlatformProviderId } from "@/lib/integrations/hub-platform/connection-types";
import type { HubDevConnectionId } from "@/lib/hub/dev/hub-connection-store";
import { setPendingHubLoopResume } from "@/lib/hub/dev/hub-connection-store";

export type HubAgentControllerEvent =
  | { readonly type: "intent"; readonly intent: UserIntent; readonly executable: boolean }
  | { readonly type: "conversational"; readonly body: string }
  | HubAgentLoopEvent;

export type HubAgentControllerInput = Omit<HubAgentLoopInput, "onEvent"> & {
  readonly onEvent: (event: HubAgentControllerEvent) => void;
  /** Ignored — execution always starts from current utterance only. */
  readonly staleGoal?: string | null;
  readonly modelId?: string | null;
  /** Set by runAgentTurn so the controller does not wrap itself. */
  readonly agentTurnAlreadyWrapped?: boolean;
};

export type HubAgentControllerResult = HubAgentLoopResult & {
  readonly executionStarted: boolean;
  readonly toolCalls: number;
  readonly intent: UserIntent;
  readonly conversational: boolean;
};

function buildToolCtx(input: HubAgentControllerInput, stripeConnected: boolean): HubWorkspaceToolContext {
  const conn = input.connections ?? {};
  return {
    getDraft: () => input.executor.getDraft() as PlatformDraft,
    updateDraft: (patch) => input.executor.updateDraft(patch),
    snapshot: input.snapshot,
    executor: input.executor,
    connections: {
      github: conn.github ?? false,
      openai: conn.openai ?? false,
      stripe: stripeConnected,
      vercel: conn.vercel ?? false,
      supabase: conn.supabase ?? false,
      mcp: conn.mcp ?? false,
    },
  };
}

function isProviderConnected(
  provider: HubPlatformProviderId,
  input: HubAgentControllerInput,
): boolean {
  const conn = input.connections ?? {};
  switch (provider) {
    case "stripe":
      return input.stripeConnected ?? conn.stripe ?? false;
    case "github":
      return conn.github ?? false;
    case "vercel":
      return conn.vercel ?? false;
    case "supabase":
      return conn.supabase ?? false;
    case "openai":
      return conn.openai ?? false;
    case "mcp":
      return conn.mcp ?? false;
    default:
      return false;
  }
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
  const provider = resolveConnectProviderFromUtterance(input.utterance);
  const label = providerLabel(provider);
  const actionId = connectActionIdForProvider(provider);

  emit({ type: "intent", intent: "connect", executable: true });
  emit({ type: "text", body: `${label}에 연결할게요.` });

  await invokeHubWorkspaceTool("connection.list", {}, toolCtx);
  const toolCalls = 1;

  if (isProviderConnected(provider, input)) {
    emit({ type: "text", body: `${label}는 이미 연결되어 있어요.` });
    emit({ type: "complete", summary: `${label} 연결됨` });
    return {
      ok: true,
      executionStarted: true,
      toolCalls,
      intent: "connect",
      conversational: false,
      snapshot: input.snapshot,
      draft: toolCtx.getDraft(),
    };
  }

  await invokeHubWorkspaceTool("connection.connect", { provider }, toolCtx);
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
    executionStarted: true,
    toolCalls: toolCalls + 1,
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
  const fullObs = observeFullWorkspace({
    draft: toolCtx.getDraft(),
    snapshot: input.snapshot,
    connections: toolCtx.connections,
  });
  emit({ type: "observe", lines: fullObs.lines });
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
  const platformId = input.platformId ?? input.draft.id;
  const memory = readOperatorMemory(platformId);
  const resolved = resolveOperatorTurn({ utterance: input.utterance.trim(), memory });
  const utterance = resolved.expandedUtterance;

  if (resolved.reference.hadReference && resolved.reference.focus) {
    emit({
      type: "thought",
      title: "참조 해석",
      body: `${resolved.reference.substitutions.map((s) => `${s.from} → ${s.to}`).join(", ") || resolved.reference.focus.label}`,
    });
  }
  if (resolved.implicit.inferred) {
    emit({ type: "thought", title: "이어지는 작업", body: utterance });
  }

  const gate = runConversationGate({
    utterance,
    context: {
      currentPlatform: input.draft.name,
      platformName: input.draft.name,
      staleGoal: input.staleGoal ?? null,
      currentGoal: memory.currentGoal,
      currentTask: memory.currentTask,
      currentObject: memory.lastObjects[memory.lastObjects.length - 1] ?? null,
      history: memory.history,
    },
  });

  const goalChange = resolveOperatorTurn({
    utterance: input.utterance.trim(),
    memory,
    nextGoal: gate.currentGoal ?? utterance,
  }).goalChange;
  if (goalChange?.changed && goalChange.reasonKo) {
    emit({ type: "replan", reason: goalChange.reasonKo });
    rememberOperatorFocus(platformId, { goal: goalChange.nextGoal, workInProgress: true });
  }

  emit({ type: "intent", intent: gate.intent, executable: gate.executable });

  if (gate.conversational || gate.needsClarification) {
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

  const agentState = createInitialAgentState({ goal: gate.currentGoal ?? utterance, intent: gate.intent });

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

  if (gate.intent === "test" && !/lint|typecheck|타입|e2e|생성|만들/i.test(utterance)) {
    return runTestOnly({ ...input, utterance });
  }

  if (gate.intent === "connect") {
    return runConnectOnly(input);
  }

  let toolCalls = 0;
  const loopResult = await runHubAgentLoop({
    ...input,
    utterance,
    userIntent: gate.intent,
    platformGoal: gate.platformGoal ?? undefined,
    modelId: input.modelId,
    conversationMemory: readOperatorMemory(platformId),
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
  input: HubAgentControllerInput & {
    readonly resumeUtterance?: string;
    readonly resumeProvider?: HubPlatformProviderId;
  },
): Promise<HubAgentControllerResult> {
  const provider = input.resumeProvider ?? "stripe";
  const storeId = provider as HubDevConnectionId;
  const conn = input.connections ?? {};
  const connections = {
    github: conn.github ?? false,
    openai: conn.openai ?? false,
    stripe: conn.stripe ?? false,
    vercel: conn.vercel ?? false,
    supabase: conn.supabase ?? false,
    mcp: conn.mcp ?? false,
    [storeId]: true,
  };

  return runHubAgentController({
    ...input,
    utterance: input.resumeUtterance ?? resumeUtteranceForProvider(provider),
    stripeConnected: provider === "stripe" ? true : input.stripeConnected,
    connections,
  });
}
