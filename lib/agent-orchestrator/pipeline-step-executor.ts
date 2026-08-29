/**
 * Reality Pipeline step executor — dispatches PlanDAG nodes to domain agents.
 */

import type { PlanDAG } from "@/lib/reality-planner/types";
import type { PipelineStepExecutor } from "@/lib/reality-orchestration/run-reality-pipeline";
import { buildAgentTasks, dispatchAgentTasks } from "@/lib/agent-orchestrator/dispatch-agents";

export function createAgentDispatchStepExecutor(input: {
  readonly dag: PlanDAG;
  readonly utterance: string;
}): PipelineStepExecutor {
  const nodeById = new Map(input.dag.nodes.map((n) => [n.id, n]));

  return async (stepId: string) => {
    const node = nodeById.get(stepId);
    if (!node?.agentId) {
      return { stepId, skipped: true, reason: "no_agent" };
    }

    const tasks = buildAgentTasks([node], input.dag.contextEventId, {
      utterance: input.utterance,
    });
    const results = await dispatchAgentTasks(tasks, { utterance: input.utterance });
    return results[0] ?? { stepId, success: false, errorReason: "no_result" };
  };
}
