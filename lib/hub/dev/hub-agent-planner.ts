/**
 * Hub Agent Planner — structured plan from observation + ADR-045 judgment.
 * Regex/heuristic fallback when runtime strategy is Quick.
 */

import type { HubWorkspaceInspectResult, HubWorkspaceToolId } from "@/lib/hub/dev/hub-workspace-tools";
import type { HubAgentPlanStep } from "@/lib/hub/dev/hub-agent-loop";
import type { AgentStrategyId } from "@/lib/workstream/agent-judgment-chain";
import { enterHubAgentRuntimeTurn } from "@/lib/hub/dev/hub-agent-runtime-ingress";
import { compilePlatformGoal, executionModeFromGoal } from "@/lib/hub/dev/platform-agent/platform-goal";
import { extractStructuredGoal } from "@/lib/hub/dev/platform-agent/goal-extraction";
import { discoverPlatformContext } from "@/lib/hub/dev/platform-agent/context-discovery";
import { decomposePlatformGoal } from "@/lib/hub/dev/platform-agent/task-decomposition";
import { planPlatformChanges } from "@/lib/hub/dev/platform-agent/platform-planner";
import { compileHubCreatorIntent } from "@/lib/hub/dev/hub-intent-compiler";
import { fetchOperatorLlmPlan } from "@/lib/hub/dev/operator-llm-planner";
import { wantsLoopBuilderUtterance, wantsLoopTestUtterance } from "@/lib/hub/dev/hub-loop-agent";
import type { OperatorConversationMemory } from "@/lib/hub/dev/conversation-memory";
import { getRepoSession } from "@/lib/hub/dev/coding-agent/repo-session";
import { wantsRepoClone } from "@/lib/hub/dev/coding-agent/repo-intent";

export type HubAgentStructuredPlan = {
  readonly goal: string;
  readonly strategy: AgentStrategyId;
  readonly steps: readonly HubAgentPlanStep[];
  readonly source: "structured" | "regex" | "intent" | "platform" | "llm";
  readonly runtimeContextEventId: string;
  readonly goalKo: string | null;
  readonly intentSummaryKo?: string;
  readonly executionMode?: "platform" | "code_direct";
  readonly platformPlanSummary?: string;
  readonly extractedConstraints?: readonly string[];
  readonly relevantContextIds?: readonly string[];
  readonly modelId?: string | null;
};

function wantsPayment(utterance: string): boolean {
  return /stripe|결제|payment|commerce/i.test(utterance);
}

function wantsBuild(utterance: string): boolean {
  return /만들|build|create|추가|platform|플랫폼|호텔|hotel|workflow|워크플/i.test(utterance);
}

function wantsTest(utterance: string): boolean {
  return /test|테스트|검증|verify/i.test(utterance);
}

function wantsDeploy(utterance: string): boolean {
  return /deploy|배포|publish|출시/i.test(utterance);
}

function wantsSchemaUpdate(utterance: string): boolean {
  return /schema|스키마|input|output|필드|field/i.test(utterance);
}

function wantsWorkflow(utterance: string): boolean {
  return /workflow|워크플|플로우|flow/i.test(utterance);
}

function step(
  id: string,
  label: string,
  toolId: HubWorkspaceToolId,
  args?: Record<string, unknown>,
): HubAgentPlanStep {
  return { id, label, toolId, args };
}

function buildStructuredSteps(
  utterance: string,
  inspect: HubWorkspaceInspectResult,
  stripeConnected: boolean,
  strategy: AgentStrategyId,
): HubAgentPlanStep[] {
  const steps: HubAgentPlanStep[] = [step("observe", "프로젝트 확인", "workspace.inspect")];

  if (wantsLoopBuilderUtterance(utterance)) {
    steps.push(step("loop_create", "Loop 생성", "loop.create", { utterance }));
    steps.push(step("loop_lint", "Loop AI 검증", "loop.lint"));
    if (/test|테스트|실험|돌려|run/i.test(utterance)) {
      steps.push(step("loop_test", "Loop 테스트", "loop.test"));
    }
    return steps;
  }

  if (wantsLoopTestUtterance(utterance)) {
    steps.push(step("loop_read", "Loop 확인", "loop.read"));
    steps.push(step("loop_test", "Loop 테스트", "loop.test"));
    return steps;
  }

  if (wantsPayment(utterance)) {
    steps.push(step("connections", "연결 상태 확인", "connection.list"));
    if (!stripeConnected) {
      steps.push(step("ask_stripe", "Stripe 연결", "connection.connect", { provider: "stripe" }));
    }
    if (!inspect.capabilities.includes("payment.prepare")) {
      steps.push(step("add_prepare", "payment.prepare 생성", "file.patch", { payment: true }));
    }
    if (!inspect.capabilities.includes("payment.commit")) {
      steps.push(step("add_commit", "payment.commit 생성", "file.patch", { payment: true }));
    }
    if (wantsSchemaUpdate(utterance)) {
      steps.push(
        step("schema_commit", "payment.commit 스키마", "schema.update", {
          capability: "payment.commit",
          fixApprovalToken: true,
        }),
      );
    }
    if (wantsWorkflow(utterance)) {
      steps.push(step("workflow_read", "워크플로우 확인", "workflow.read"));
      steps.push(
        step("workflow_create", "결제 워크플로우", "workflow.create", {
          description: "payment.prepare → user approval → payment.commit",
        }),
      );
    }
    steps.push(step("test", "테스트 실행", "test.run"));
    if (strategy !== "quick") {
      steps.push(step("verify_deploy", "Publish 준비 확인", "deploy.prepare"));
      steps.push(step("publish_request", "Publish 요청", "publish.request"));
    }
    return steps;
  }

  if (wantsWorkflow(utterance)) {
    steps.push(step("workflow_read", "워크플로우 확인", "workflow.read"));
    steps.push(
      step("workflow_create", "워크플로우 정의", "workflow.create", {
        description: utterance.slice(0, 120),
      }),
    );
    if (strategy === "multi") {
      steps.push(step("perm_read", "권한 확인", "permission.read"));
    }
  }

  if (wantsDeploy(utterance)) {
    steps.push(step("deploy_prepare", "배포 준비", "deploy.prepare"));
    steps.push(step("test", "테스트 실행", "test.run"));
    steps.push(step("publish_request", "Publish 요청", "publish.request"));
    return steps;
  }

  if (wantsRepoClone(utterance)) {
    steps.push(step("clone", "레포 클론", "repo.clone", { utterance }));
    steps.push(step("tree", "파일 탐색", "code.listFiles"));
    return steps;
  }

  if (/lint/i.test(utterance)) {
    steps.push(step("lint", "Lint", "lint.run"));
    return steps;
  }

  if (/type\s*check|타입|tsc/i.test(utterance)) {
    steps.push(step("types", "Type check", "typecheck.run"));
    return steps;
  }

  if (/e2e/i.test(utterance)) {
    steps.push(step("e2e", "E2E", "test.e2e"));
    return steps;
  }

  if (
    /오늘\s*주문|주문\s*몇|내\s*주문|치킨\s*주문|주문\s*취소|매출|조리중|배달중/.test(utterance)
  ) {
    steps.push(step("resource", "주문 Experience 적용", "resource.apply", { utterance }));
    return steps;
  }

  if (
    /테이블|버킷|storage|role|역할|secret|도메인|사용자|결제|메뉴|판매자|호텔\s*검색/i.test(utterance) &&
    /만들|생성|추가|create|연결|되돌려|롤백|배포/i.test(utterance)
  ) {
    steps.push(step("resource", "Infrastructure 적용", "resource.apply", { utterance }));
    steps.push(step("verify", "Verification", "verification.run"));
    return steps;
  }

  if (/dev\s*server|개발\s*서버|서버\s*(켜|실행|멈춰)/i.test(utterance)) {
    const stop = /멈춰|stop|꺼/i.test(utterance);
    steps.push(step("server", stop ? "Dev 서버 중지" : "Dev 서버 시작", stop ? "server.stop" : "server.start"));
    return steps;
  }

  if (wantsTest(utterance)) {
    steps.push(step("discover", "테스트 찾기", "test.discover"));
    steps.push(step("test", "테스트 실행", "test.run"));
    if (/생성|만들|generate/i.test(utterance)) {
      steps.unshift(step("gen", "테스트 생성", "test.generate", { query: utterance }));
    }
    return steps;
  }

  if (wantsSchemaUpdate(utterance)) {
    const cap = inspect.capabilities.find((c) => utterance.toLowerCase().includes(c.split(".")[0] ?? ""));
    steps.push(
      step("schema_update", "스키마 업데이트", "schema.update", {
        capability: cap ?? inspect.capabilities[0] ?? "payment.commit",
      }),
    );
    steps.push(step("test", "테스트 실행", "test.run"));
    return steps;
  }

  if (wantsBuild(utterance) && inspect.capabilities.length === 0) {
    steps.push(step("resource", "Experience 구성", "resource.apply", { op: "experience.build", utterance }));
    steps.push(step("verify", "Verification", "verification.run"));
    return steps;
  }

  if (strategy === "multi" || wantsBuild(utterance)) {
    steps.push(step("preview", "미리보기", "preview.run"));
  }

  steps.push(step("test", "테스트 실행", "test.run"));
  return steps;
}

/** Regex-only fallback (no runtime ingress). */
export function planHubAgentTurnRegex(
  utterance: string,
  inspect: HubWorkspaceInspectResult,
  stripeConnected: boolean,
): readonly HubAgentPlanStep[] {
  return buildStructuredSteps(utterance, inspect, stripeConnected, "planning");
}

/** Structured planner — Platform Planner → intent compiler → ADR-045 runtime → step graph. */
export async function planHubAgentTurn(input: {
  readonly utterance: string;
  readonly inspect: HubWorkspaceInspectResult;
  readonly stripeConnected: boolean;
  readonly platformId?: string;
  readonly skipRuntime?: boolean;
  readonly userIntent?: import("@/lib/agent/conversation/intent-types").UserIntent;
  readonly draft?: import("@/lib/hub/platform/types").PlatformDraft;
  readonly modelId?: string | null;
  readonly memory?: OperatorConversationMemory | null;
  readonly skipLlm?: boolean;
}): Promise<HubAgentStructuredPlan> {
  const extracted = extractStructuredGoal({
    utterance: input.utterance,
    intent: input.userIntent ?? "modify",
    platformName: input.inspect.platformName,
  });
  const platformGoal = extracted.platformGoal;

  const discovery = input.draft
    ? discoverPlatformContext({
        goal: platformGoal,
        utterance: input.utterance,
        draft: input.draft,
      })
    : null;

  const taskGraph =
    discovery && input.draft
      ? decomposePlatformGoal({
          goal: platformGoal,
          discovery,
          stripeConnected: input.stripeConnected,
        })
      : null;

  const platformPlan =
    discovery && input.draft
      ? planPlatformChanges({
          goal: platformGoal,
          discovery,
          draft: input.draft,
          stripeConnected: input.stripeConnected,
        })
      : null;

  const intent = compileHubCreatorIntent({
    utterance: input.utterance,
    state: input.inspect,
    stripeConnected: input.stripeConnected,
  });

  const executionMode = executionModeFromGoal(platformGoal);
  const repoReady = Boolean(input.draft && getRepoSession(input.draft.id));

  if (!input.skipLlm && input.modelId) {
    const llmPlan = await fetchOperatorLlmPlan({
      utterance: input.utterance,
      inspect: {
        platformName: input.inspect.platformName,
        capabilities: input.inspect.capabilities,
      },
      memory: input.memory,
      repoReady,
      modelId: input.modelId,
    });
    if (llmPlan && llmPlan.steps.length > 0) {
      return {
        goal: llmPlan.goalKo || platformGoal.summary,
        strategy: "planning",
        steps: llmPlan.steps,
        source: "llm",
        runtimeContextEventId: `hub:workspace:${input.platformId ?? "dev"}`,
        goalKo: llmPlan.goalKo,
        intentSummaryKo: llmPlan.goalKo,
        executionMode,
        platformPlanSummary: llmPlan.goalKo,
        extractedConstraints: extracted.constraints.map((c) => c.label),
        relevantContextIds: discovery?.relevantContext.map((r) => r.id),
        modelId: llmPlan.modelId,
      };
    }
  }

  if (input.skipRuntime) {
    const steps =
      intent?.steps ??
      platformPlan?.platformSteps ??
      taskGraph?.steps ??
      buildStructuredSteps(input.utterance, input.inspect, input.stripeConnected, "planning");
    return {
      goal: platformGoal.summary,
      strategy: "planning",
      steps,
      source: intent ? "intent" : platformPlan ? "platform" : taskGraph ? "structured" : "regex",
      runtimeContextEventId: `hub:workspace:${input.platformId ?? "dev"}`,
      goalKo: platformPlan?.summaryKo ?? intent?.summaryKo ?? platformGoal.summaryKo,
      intentSummaryKo: platformPlan?.summaryKo ?? intent?.summaryKo,
      executionMode,
      platformPlanSummary: platformPlan?.summaryKo,
      extractedConstraints: extracted.constraints.map((c) => c.label),
      relevantContextIds: discovery?.relevantContext.map((r) => r.id),
    };
  }

  const runtime = enterHubAgentRuntimeTurn({
    utterance: input.utterance,
    platformId: input.platformId ?? "dev",
  });

  const steps =
    intent?.steps ??
    platformPlan?.platformSteps ??
    taskGraph?.steps ??
    buildStructuredSteps(input.utterance, input.inspect, input.stripeConnected, runtime.strategy);

  return {
    goal: platformGoal.summary,
    strategy: runtime.strategy,
    steps,
    source: intent ? "intent" : platformPlan ? "platform" : taskGraph ? "structured" : "structured",
    runtimeContextEventId: runtime.contextEventId,
    goalKo: platformPlan?.summaryKo ?? intent?.summaryKo ?? runtime.goalKo,
    intentSummaryKo: platformPlan?.summaryKo ?? intent?.summaryKo,
    executionMode,
    platformPlanSummary: platformPlan?.summaryKo,
    extractedConstraints: extracted.constraints.map((c) => c.label),
    relevantContextIds: discovery?.relevantContext.map((r) => r.id),
  };
}
