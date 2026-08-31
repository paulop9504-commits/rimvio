/**
 * Regression repair — compare verify snapshots and emit repair steps.
 */

import type { HubAgentPlanStep } from "@/lib/hub/dev/hub-agent-loop";
import {
  parseVerifyFailures,
  type VerifyCommandResult,
} from "@/lib/hub/dev/coding-agent/verify-types";

export type VerifySnapshot = {
  readonly results: readonly VerifyCommandResult[];
  readonly failedKinds: readonly string[];
  readonly failureLines: readonly string[];
};

export type RegressionRepairPlan = {
  readonly detected: boolean;
  readonly summaryKo: string;
  readonly newFailures: readonly string[];
  readonly steps: readonly HubAgentPlanStep[];
};

export function snapshotVerifyResults(results: readonly VerifyCommandResult[]): VerifySnapshot {
  const failed = results.filter((r) => !r.ok && !r.skipped);
  return {
    results,
    failedKinds: failed.map((r) => r.kind),
    failureLines: failed.flatMap((r) => parseVerifyFailures(r)),
  };
}

export function detectVerifyRegression(
  before: VerifySnapshot | null,
  after: VerifySnapshot,
): { detected: boolean; newFailures: readonly string[] } {
  if (!before) {
    return { detected: after.failedKinds.length > 0, newFailures: after.failureLines };
  }
  const beforeSet = new Set(before.failureLines);
  const newFailures = after.failureLines.filter((line) => !beforeSet.has(line));
  const newKinds = after.failedKinds.filter((k) => !before.failedKinds.includes(k));
  return {
    detected: newFailures.length > 0 || newKinds.length > 0,
    newFailures: newFailures.length > 0 ? newFailures : after.failureLines,
  };
}

export function planRegressionRepair(input: {
  readonly after: VerifySnapshot;
  readonly newFailures: readonly string[];
}): RegressionRepairPlan {
  const steps: HubAgentPlanStep[] = [];
  const kinds = new Set(input.after.failedKinds);

  if (kinds.has("lint")) {
    steps.push({
      id: "repair-lint",
      label: "Lint 재실행",
      toolId: "lint.run",
    });
  }
  if (kinds.has("typecheck")) {
    steps.push({
      id: "repair-types",
      label: "타입 재검사",
      toolId: "typecheck.run",
    });
  }
  if (kinds.has("unit") || kinds.has("integration")) {
    steps.push({
      id: "repair-test",
      label: "테스트 재실행",
      toolId: "test.run",
    });
  }
  if (kinds.has("e2e")) {
    steps.push({
      id: "repair-e2e",
      label: "E2E 재실행",
      toolId: "test.e2e",
    });
  }

  if (steps.length === 0 && input.newFailures.length > 0) {
    steps.push({ id: "repair-test", label: "테스트 재실행", toolId: "test.run" });
  }

  const detected = input.after.failedKinds.length > 0;
  return {
    detected,
    summaryKo: detected
      ? `회귀 ${input.after.failedKinds.join(", ") || "실패"} — 자동 수리 재실행`
      : "회귀 없음",
    newFailures: input.newFailures,
    steps,
  };
}
