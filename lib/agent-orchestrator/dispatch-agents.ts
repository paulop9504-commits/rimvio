/**
 * Dispatch agent tasks from PlanDAG batches.
 */

import type { PlanNode } from "@/lib/reality-planner/types";
import type { AgentTaskInput, AgentTaskResult } from "@/lib/agent-orchestrator/types";
import { getAgent } from "@/lib/agent-orchestrator/agent-registry";

/**
 * Build AgentTaskInputs from a batch of PlanNodes.
 */
export function buildAgentTasks(
  nodes: readonly PlanNode[],
  contextEventId: string,
): readonly AgentTaskInput[] {
  return nodes
    .filter((n) => n.agentId)
    .map((n) => ({
      nodeId: n.id,
      agentId: n.agentId!,
      label: n.label,
      contextEventId,
    }));
}

/**
 * Execute agent tasks in parallel (stub — real agents plug in via registry).
 * Each registered agent would have an executor; this provides the coordination frame.
 */
export async function dispatchAgentTasks(
  tasks: readonly AgentTaskInput[],
): Promise<readonly AgentTaskResult[]> {
  const results: AgentTaskResult[] = [];

  const promises = tasks.map(async (task) => {
    const start = Date.now();
    const agent = getAgent(task.agentId);

    if (!agent) {
      return {
        nodeId: task.nodeId,
        agentId: task.agentId,
        success: false,
        errorReason: `Agent "${task.agentId}" not registered`,
        durationMs: Date.now() - start,
      };
    }

    // Stub execution — real agents would call domain-specific logic here
    return {
      nodeId: task.nodeId,
      agentId: task.agentId,
      success: true,
      result: { agent: agent.agentId, domain: agent.domain },
      durationMs: Date.now() - start,
    };
  });

  const settled = await Promise.allSettled(promises);
  for (const s of settled) {
    if (s.status === "fulfilled") {
      results.push(s.value);
    }
  }

  return results;
}
