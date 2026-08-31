/**
 * Platform Planner (P1) — Goal → Platform-level change plan.
 */

import type { HubAgentPlanStep } from "@/lib/hub/dev/hub-agent-loop";
import type { HubWorkspaceToolId } from "@/lib/hub/dev/hub-workspace-tools";
import type { DiscoveredPlatformContext } from "@/lib/hub/dev/platform-agent/context-discovery";
import type { PlatformGoal } from "@/lib/hub/dev/platform-agent/platform-goal";
import type { PlatformDraft } from "@/lib/hub/platform/types";

export type PlatformPlanPhase =
  | "understand"
  | "explore"
  | "plan"
  | "build"
  | "code"
  | "test"
  | "verify"
  | "preview"
  | "review"
  | "publish";

export type PlatformPlan = {
  readonly goal: PlatformGoal;
  readonly summaryKo: string;
  readonly phases: readonly PlatformPlanPhase[];
  readonly capabilities: readonly string[];
  readonly workflows: readonly string[];
  readonly schemas: readonly string[];
  readonly permissions: readonly string[];
  readonly connections: readonly string[];
  readonly platformSteps: readonly HubAgentPlanStep[];
  readonly codingRequired: boolean;
  readonly discovery: DiscoveredPlatformContext;
};

function step(
  id: string,
  label: string,
  toolId: HubWorkspaceToolId,
  args?: Record<string, unknown>,
): HubAgentPlanStep {
  return { id, label, toolId, args };
}

/** Capability #41 — End-to-end platform creation plan (hotel booking journey). */
export function planPlatformCreationE2E(input: {
  readonly goal: PlatformGoal;
  readonly discovery: DiscoveredPlatformContext;
  readonly draft: PlatformDraft;
  readonly stripeConnected: boolean;
}): PlatformPlan {
  const { goal, discovery } = input;
  const caps = goal.requestedCapabilities.length
    ? [...goal.requestedCapabilities]
    : [...discovery.missingCapabilities];

  const steps: HubAgentPlanStep[] = [
    step("e2e_observe", "Platform 상태 확인", "workspace.inspect"),
    step("e2e_discover", "Context 탐색", "workspace.search", {
      query: goal.summaryKo,
      capabilities: discovery.relevantContext.map((r) => r.id).slice(0, 6),
    }),
  ];

  for (const cap of caps) {
    if (discovery.existingCapabilities.includes(cap)) continue;
    steps.push(step(`e2e_create_${cap}`, `${cap} 생성`, "capability.create", { capability: cap, name: cap }));
    steps.push(step(`e2e_schema_${cap}`, `${cap} schema`, "schema.update", { capability: cap }));
  }

  steps.push(
    step("e2e_workflow", "End-to-end workflow", "workflow.create", {
      description: goal.flows[0] ?? "hotel.search → booking.prepare → payment.prepare → payment.commit",
    }),
  );

  if (!input.stripeConnected && caps.some((c) => c.startsWith("payment."))) {
    steps.push(step("e2e_stripe", "Stripe 연결", "connection.connect", { provider: "stripe" }));
  }

  steps.push(step("e2e_test", "Sandbox 테스트", "test.run"));
  steps.push(step("e2e_preview", "Preview 검증", "preview.run"));
  steps.push(step("e2e_verify", "Platform 검증", "deploy.prepare"));

  const phases: PlatformPlanPhase[] = ["understand", "explore", "plan", "build", "test", "verify", "preview"];
  appendSourceSyncIfNeeded(steps, phases);

  return {
    goal,
    summaryKo: `${goal.summaryKo} (E2E)`,
    phases,
    capabilities: caps,
    workflows: goal.flows.length ? goal.flows : ["search → book → pay"],
    schemas: caps,
    permissions: caps.filter((c) => c.includes("payment") || c.includes("booking")),
    connections: caps.some((c) => c.startsWith("payment.")) ? ["stripe"] : [],
    platformSteps: steps,
    codingRequired: discovery.missingCapabilities.length > 0,
    discovery,
  };
}

const MUTATING_TOOL_IDS = new Set([
  "capability.create",
  "schema.update",
  "workflow.create",
  "workflow.update",
  "code.modifyFile",
  "file.patch",
]);

function appendSourceSyncIfNeeded(steps: HubAgentPlanStep[], phases: PlatformPlanPhase[]): void {
  const hasMutations = steps.some((s) => MUTATING_TOOL_IDS.has(s.toolId));
  if (!hasMutations) return;
  if (steps.some((s) => s.toolId === "platform.sync")) return;
  phases.push("review");
  steps.push(step("source_sync", "Platform ↔ Source 동기화", "platform.sync", { direction: "export" }));
}

/** Build Platform-level plan from goal + discovery. */
export function planPlatformChanges(input: {
  readonly goal: PlatformGoal;
  readonly discovery: DiscoveredPlatformContext;
  readonly draft: PlatformDraft;
  readonly stripeConnected: boolean;
}): PlatformPlan {
  const { goal, discovery } = input;
  const steps: HubAgentPlanStep[] = [];
  const phases: PlatformPlanPhase[] = ["understand", "explore", "plan"];
  const caps = [...goal.requestedCapabilities];
  const codingRequired = goal.scope.kind === "code_direct" || discovery.missingCapabilities.length > 0;

  if (goal.scope.kind === "code_direct") {
    phases.push("code", "test", "verify");
    if (goal.scope.targetPath) {
      steps.push(step("code_read", "소스 읽기", "code.readFile", { path: goal.scope.targetPath }));
      steps.push(step("code_edit", "코드 수정", "code.modifyFile", {
        path: goal.scope.targetPath,
        symbol: goal.scope.targetSymbol,
      }));
    } else if (goal.scope.targetCapability) {
      steps.push(step("code_search", "Capability 구현 탐색", "code.searchSymbol", {
        capability: goal.scope.targetCapability,
      }));
      steps.push(step("code_read", "소스 읽기", "code.readFile", {
        capability: goal.scope.targetCapability,
      }));
      steps.push(step("code_edit", "코드 수정", "code.modifyFile", {
        capability: goal.scope.targetCapability,
      }));
    }
    steps.push(step("test", "테스트 실행", "test.run"));
    appendSourceSyncIfNeeded(steps, phases);
    return {
      goal,
      summaryKo: goal.summaryKo,
      phases,
      capabilities: caps,
      workflows: [],
      schemas: caps,
      permissions: [],
      connections: [],
      platformSteps: steps,
      codingRequired: true,
      discovery,
    };
  }

  phases.push("build", "test", "verify");

  steps.push(step("discover", "Platform context 탐색", "workspace.search", {
    query: goal.summary.slice(0, 80),
    capabilities: discovery.relatedCapabilities,
  }));

  for (const cap of discovery.missingCapabilities) {
    steps.push(step(`create_${cap}`, `${cap} 생성`, "capability.create", { capability: cap, name: cap }));
    steps.push(step(`schema_${cap}`, `${cap} schema`, "schema.update", { capability: cap }));
  }

  if (goal.domain === "hotel_booking" && discovery.missingCapabilities.length >= 3) {
    steps.push(
      step("workflow", "Booking workflow", "workflow.create", {
        description: goal.flows[0] ?? "hotel.search → booking.prepare → payment.prepare → payment.commit",
      }),
    );
    phases.push("preview");
    steps.push(step("preview", "Preview", "preview.run"));
  }

  if (/가격순|price\s*sort/i.test(goal.summary)) {
    steps.push(step("sort_patch", "hotel.search 정렬", "code.modifyFile", {
      capability: "hotel.search",
      sort: "price",
    }));
    steps.push(step("schema_sort", "search response schema", "schema.update", { capability: "hotel.search" }));
  }

  if (/취소.*환불|refund/i.test(goal.summary)) {
    if (!input.draft.actions.some((a) => a.name === "payment.refund")) {
      steps.push(step("refund_cap", "payment.refund 생성", "capability.create", {
        capability: "payment.refund",
        name: "payment.refund",
      }));
    }
    steps.push(step("workflow_refund", "cancel → refund workflow", "workflow.update", {
      description: "booking.cancel → payment.refund",
    }));
    for (const path of discovery.sourcePaths.slice(0, 3)) {
      steps.push(step(`code_${path}`, `수정: ${path.split("/").pop()}`, "code.modifyFile", { path }));
    }
  }

  if (goal.intent === "create" && goal.domain === "hotel_booking") {
    return planPlatformCreationE2E(input);
  }

  if (!input.stripeConnected && caps.some((c) => c.startsWith("payment."))) {
    steps.push(step("stripe", "Stripe 연결", "connection.connect", { provider: "stripe" }));
  }

  steps.push(step("test", "테스트 실행", "test.run"));
  steps.push(step("verify", "Platform 검증", "deploy.prepare"));
  appendSourceSyncIfNeeded(steps, phases);

  if (goal.intent === "publish") {
    phases.push("review", "publish");
    steps.push(step("publish", "Publish 요청", "deploy.prepare", { publish: true }));
  }

  return {
    goal,
    summaryKo: goal.summaryKo,
    phases,
    capabilities: caps.length ? caps : discovery.relatedCapabilities,
    workflows: goal.flows,
    schemas: caps,
    permissions: caps.filter((c) => c.includes("payment") || c.includes("booking")),
    connections: caps.some((c) => c.startsWith("payment.")) ? ["stripe"] : [],
    platformSteps: steps,
    codingRequired,
    discovery,
  };
}
