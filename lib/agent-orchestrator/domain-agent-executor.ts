/**
 * Domain Agent Executor — registry → real Tool Gateway loops (P3).
 */

import { getAgent } from "@/lib/agent-orchestrator/agent-registry";
import {
  createAgentExecutionContext,
  type AgentExecutionContext,
  type AgentExecutionResult,
} from "@/lib/agent-orchestrator/execution-context";
import { runObserveDecideLoop } from "@/lib/agent-orchestrator/observe-decide-loop";
import { evaluateGoalConvergence } from "@/lib/agent-orchestrator/goal-convergence";
import { traceEvent } from "@/lib/agent-orchestrator/agent-trace";
import type { AgentTaskInput, AgentTaskResult } from "@/lib/agent-orchestrator/types";
import { runAgentController } from "@/lib/agent/agent-controller";
import { isTripPrepUtterance } from "@/lib/action-planner/build-trip-prep-plan";
import { ensureSessionGraph } from "@/lib/graph-command/session-graph-store";
import { buildAgentObservation } from "@/lib/agent/observation";
import { selectNextCapabilityFromState } from "@/lib/agent-os/select-next-capability";

function goalFromTask(task: AgentTaskInput, utterance: string) {
  return {
    id: task.nodeId,
    summary: utterance,
    summaryKo: task.label || utterance,
    domain: getAgent(task.agentId)?.domain,
  };
}

async function executeViaAgentController(
  ctx: AgentExecutionContext,
): Promise<AgentExecutionResult> {
  const utterance = ctx.conversation.utterance;
  const controller = await runAgentController({
    utterance,
    contextEventId: ctx.task.contextEventId,
    useLlm: false,
    maxIterations: 3,
  });

  if (!controller.ok) {
    return {
      status: "blocked",
      observation: {
        planId: ctx.task.nodeId,
        stepId: ctx.task.nodeId,
        stepKind: "blocked",
        success: false,
        errors: [controller.reason],
        summaryKo: "Agent Controller 미적용",
      },
      observations: [],
      reason: controller.reason,
      trace: ctx.trace,
    };
  }

  const observation = controller.observation;
  const convergence = evaluateGoalConvergence({
    goal: ctx.goal,
    actionPlan: controller.plan,
    observations: controller.observations,
  });

  let status: AgentExecutionResult["status"] = "completed";
  if (controller.run.waitingCommit) {
    status = "needs_user";
  } else if (convergence.status === "needs_more_work") {
    status = "needs_next_action";
  } else if (convergence.status === "blocked") {
    status = "blocked";
  }

  let trace = traceEvent(ctx.trace, "goal.completed", convergence.summaryKo, {
    taskId: ctx.task.nodeId,
    agentId: ctx.task.agentId,
  });

  if (controller.run.waitingCommit) {
    trace = traceEvent(trace, "human_commit_requested", "wait_commit", {
      taskId: ctx.task.nodeId,
    });
  }

  const lastStepObs =
    controller.observations[controller.observations.length - 1] ??
    buildAgentObservation({
      plan: controller.plan,
      run: controller.run,
      iteration: 1,
    }).observations[0]!;

  return {
    status,
    observation: lastStepObs,
    observations: controller.observations,
    reason: convergence.summaryKo,
    trace,
  };
}

/** Execute one domain agent task with observe-decide loop or controller delegation. */
export async function executeDomainAgentTask(input: {
  readonly task: AgentTaskInput;
  readonly utterance?: string;
}): Promise<AgentExecutionResult> {
  const agent = getAgent(input.task.agentId);
  if (!agent) {
    return {
      status: "blocked",
      observation: {
        planId: input.task.nodeId,
        stepId: input.task.nodeId,
        stepKind: "blocked",
        success: false,
        errors: ["agent_not_registered"],
      },
      observations: [],
      reason: `Agent "${input.task.agentId}" not registered`,
      trace: { events: [] },
    };
  }

  ensureSessionGraph({ contextEventId: input.task.contextEventId });

  const utterance =
    input.utterance?.trim() ||
    String(input.task.parameters?.utterance ?? input.task.label ?? "");

  let ctx = createAgentExecutionContext({
    task: input.task,
    goal: goalFromTask(input.task, utterance),
    utterance,
  });

  ctx = {
    ...ctx,
    trace: traceEvent(ctx.trace, "agent.resolved", agent.agentId, {
      taskId: input.task.nodeId,
      agentId: agent.agentId,
    }),
  };

  // Full trip prep / compound → existing Agent Controller (multi-step loop)
  if (
    input.task.agentId === "lodging" &&
    (isTripPrepUtterance(utterance) || /usj|유니버설|일정|맛집/i.test(utterance))
  ) {
    return executeViaAgentController(ctx);
  }

  const result = await runObserveDecideLoop({
    ctx,
    resolveNextTool: ({ ctx: loopCtx, lastToolId, lastVerified }) => {
      const selected = selectNextCapabilityFromState({
        agentId: input.task.agentId,
        utterance: loopCtx.conversation.utterance,
        contextEventId: loopCtx.task.contextEventId,
        observations: loopCtx.observations,
        lastToolId,
        lastVerified,
      });
      if (!selected.toolId && selected.blockedReasonKo) {
        return { blocked: true, reason: selected.blockedReasonKo };
      }
      return selected.toolId;
    },
  });

  const convergence = evaluateGoalConvergence({
    goal: ctx.goal,
    observations: result.observations,
  });

  if (
    result.status === "completed" &&
    convergence.status === "needs_more_work"
  ) {
    return { ...result, status: "needs_next_action", reason: convergence.summaryKo };
  }

  return result;
}

/** Map AgentExecutionResult → AgentTaskResult for orchestrator merge. */
export function toAgentTaskResult(
  task: AgentTaskInput,
  exec: AgentExecutionResult,
  durationMs: number,
): AgentTaskResult {
  const success =
    exec.status === "completed" ||
    exec.status === "needs_next_action" ||
    exec.status === "needs_user";

  return {
    nodeId: task.nodeId,
    agentId: task.agentId,
    success,
    result: {
      status: exec.status,
      observation: exec.observation,
      observations: exec.observations,
      trace: exec.trace,
      reason: exec.reason,
    },
    errorReason: success ? undefined : exec.reason,
    durationMs,
  };
}
