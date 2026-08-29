/**
 * Coding Plan — Platform change → code-level steps (P3/P4).
 */

import type { HubAgentPlanStep } from "@/lib/hub/dev/hub-agent-loop";
import type { DiscoveredPlatformContext } from "@/lib/hub/dev/platform-agent/context-discovery";
import type { PlatformPlan } from "@/lib/hub/dev/platform-agent/platform-planner";

export type CodingPlanStep = HubAgentPlanStep & {
  readonly phase: "explore" | "read" | "edit" | "test" | "repair";
};

export type CodingPlan = {
  readonly summaryKo: string;
  readonly steps: readonly CodingPlanStep[];
  readonly sourcePaths: readonly string[];
};

function codingStep(
  id: string,
  label: string,
  phase: CodingPlanStep["phase"],
  toolId: HubAgentPlanStep["toolId"],
  args?: Record<string, unknown>,
): CodingPlanStep {
  return { id, label, toolId, args, phase };
}

/** Extract code-level steps from platform plan + discovery. */
export function buildCodingPlan(input: {
  readonly platformPlan: PlatformPlan;
  readonly discovery: DiscoveredPlatformContext;
}): CodingPlan {
  const codeSteps = input.platformPlan.platformSteps.filter((s) =>
    s.toolId.startsWith("code.") || s.toolId === "file.patch" || s.toolId === "schema.update",
  );

  const steps: CodingPlanStep[] = [];

  for (const path of input.discovery.sourcePaths.slice(0, 5)) {
    steps.push(codingStep(`explore_${path}`, `탐색: ${path}`, "explore", "code.readFile", { path }));
  }

  for (const step of codeSteps) {
    const phase: CodingPlanStep["phase"] =
      step.toolId === "code.readFile" ? "read" :
      step.toolId === "test.run" ? "test" :
      "edit";
    steps.push({ ...step, phase });
  }

  if (!steps.some((s) => s.toolId === "test.run")) {
    steps.push(codingStep("test", "테스트 실행", "test", "test.run"));
  }

  return {
    summaryKo: input.platformPlan.summaryKo,
    steps,
    sourcePaths: input.discovery.sourcePaths,
  };
}

/** Build repair steps after test failure. */
export function buildRepairCodingPlan(input: {
  readonly failedCapabilities: readonly string[];
  readonly sourcePaths: readonly string[];
}): CodingPlan {
  const steps: CodingPlanStep[] = input.failedCapabilities.map((cap, i) =>
    codingStep(`repair_schema_${i}`, `${cap} schema 수정`, "repair", "schema.update", {
      capability: cap,
      fixApprovalToken: cap.includes("payment.commit"),
    }),
  );

  for (const path of input.sourcePaths.slice(0, 2)) {
    steps.push(codingStep(`repair_${path}`, `수정: ${path}`, "repair", "code.modifyFile", { path }));
  }

  steps.push(codingStep("retest", "재테스트", "test", "test.run"));

  return {
    summaryKo: "테스트 실패 수정",
    steps,
    sourcePaths: input.sourcePaths,
  };
}
