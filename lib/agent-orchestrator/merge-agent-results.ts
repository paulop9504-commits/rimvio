/**
 * Merge agent task results, detect conflicts between agent outputs.
 */

import type { AgentTaskResult, OrchestrationResult } from "@/lib/agent-orchestrator/types";

export function mergeAgentResults(
  planId: string,
  results: readonly AgentTaskResult[],
): OrchestrationResult {
  const conflicts: string[] = [];
  const allSuccess = results.every((r) => r.success);
  const anySuccess = results.some((r) => r.success);

  // Detect scheduling conflicts (e.g. overlapping time slots from different agents)
  const timeSlots = results
    .filter((r) => r.success && r.result && typeof r.result === "object")
    .map((r) => ({ agentId: r.agentId, result: r.result as Record<string, unknown> }));

  for (let i = 0; i < timeSlots.length; i++) {
    for (let j = i + 1; j < timeSlots.length; j++) {
      const a = timeSlots[i]!;
      const b = timeSlots[j]!;
      if (a.result.timeSlot && b.result.timeSlot && a.result.timeSlot === b.result.timeSlot) {
        conflicts.push(`${a.agentId}와 ${b.agentId}의 시간대가 겹칩니다`);
      }
    }
  }

  return {
    planId,
    agentResults: results,
    conflicts,
    status: allSuccess ? "completed" : anySuccess ? "partial" : "failed",
  };
}
