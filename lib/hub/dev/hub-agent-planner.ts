/**
 * Hub Agent Planner — structured plan from observation + ADR-045 judgment.
 * Regex/heuristic fallback when runtime strategy is Quick.
 */

import type { HubWorkspaceInspectResult, HubWorkspaceToolId } from "@/lib/hub/dev/hub-workspace-tools";
import type { HubAgentPlanStep } from "@/lib/hub/dev/hub-agent-loop";
import type { AgentStrategyId } from "@/lib/workstream/agent-judgment-chain";
import { enterHubAgentRuntimeTurn } from "@/lib/hub/dev/hub-agent-runtime-ingress";

export type HubAgentStructuredPlan = {
  readonly goal: string;
  readonly strategy: AgentStrategyId;
  readonly steps: readonly HubAgentPlanStep[];
  readonly source: "structured" | "regex";
  readonly runtimeContextEventId: string;
  readonly goalKo: string | null;
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
    return steps;
  }

  if (wantsTest(utterance)) {
    steps.push(step("test", "테스트 실행", "test.run"));
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

/** Structured planner — enters ADR-045 runtime then builds step graph. */
export async function planHubAgentTurn(input: {
  readonly utterance: string;
  readonly inspect: HubWorkspaceInspectResult;
  readonly stripeConnected: boolean;
  readonly platformId?: string;
  readonly skipRuntime?: boolean;
}): Promise<HubAgentStructuredPlan> {
  if (input.skipRuntime) {
    return {
      goal: input.utterance.trim(),
      strategy: "planning",
      steps: buildStructuredSteps(
        input.utterance,
        input.inspect,
        input.stripeConnected,
        "planning",
      ),
      source: "regex",
      runtimeContextEventId: `hub:workspace:${input.platformId ?? "dev"}`,
      goalKo: null,
    };
  }

  const runtime = enterHubAgentRuntimeTurn({
    utterance: input.utterance,
    platformId: input.platformId ?? "dev",
  });

  const steps = buildStructuredSteps(
    input.utterance,
    input.inspect,
    input.stripeConnected,
    runtime.strategy,
  );

  return {
    goal: input.utterance.trim(),
    strategy: runtime.strategy,
    steps,
    source: "structured",
    runtimeContextEventId: runtime.contextEventId,
    goalKo: runtime.goalKo,
  };
}
