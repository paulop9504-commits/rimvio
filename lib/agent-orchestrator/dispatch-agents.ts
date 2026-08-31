/**
 * Dispatch agent tasks from PlanDAG batches.
 * Real execution via domain agent executor + observe-decide loop.
 */

import type { PlanNode } from "@/lib/reality-planner/types";
import type { AgentTaskInput, AgentTaskResult } from "@/lib/agent-orchestrator/types";
import {
  executeDomainAgentTask,
  toAgentTaskResult,
} from "@/lib/agent-orchestrator/domain-agent-executor";

/**
 * Build AgentTaskInputs from a batch of PlanNodes.
 */
export function buildAgentTasks(
  nodes: readonly PlanNode[],
  contextEventId: string,
  options?: { readonly utterance?: string },
): readonly AgentTaskInput[] {
  return nodes
    .filter((n) => n.agentId)
    .map((n) => ({
      nodeId: n.id,
      agentId: n.agentId!,
      label: n.labelKo ?? n.label,
      contextEventId,
      parameters: {
        utterance: options?.utterance,
        labelKo: n.labelKo,
      },
    }));
}

/**
 * Execute agent tasks — resolve agent → context → observe-decide loop → AgentObservation.
 */
export async function dispatchAgentTasks(
  tasks: readonly AgentTaskInput[],
  options?: { readonly utterance?: string },
): Promise<readonly AgentTaskResult[]> {
  const results: AgentTaskResult[] = [];

  const promises = tasks.map(async (task) => {
    const start = Date.now();
    try {
      const exec = await executeDomainAgentTask({
        task,
        utterance: options?.utterance ?? String(task.parameters?.utterance ?? ""),
      });
      return toAgentTaskResult(task, exec, Date.now() - start);
    } catch (e) {
      return {
        nodeId: task.nodeId,
        agentId: task.agentId,
        success: false,
        errorReason: e instanceof Error ? e.message : "dispatch failed",
        durationMs: Date.now() - start,
      };
    }
  });

  const settled = await Promise.allSettled(promises);
  for (const s of settled) {
    if (s.status === "fulfilled") {
      results.push(s.value);
    }
  }

  return results;
}
