/**
 * Observe → Decide → Act loop for domain agents (P5).
 * Uses Tool Gateway only — no direct API/DB mutation.
 */

import { invokeRimvioToolAsync } from "@/lib/tool-registry";
import type { RimvioToolId } from "@/lib/tool-registry";
import {
  normalizeToolInvokeResult,
} from "@/lib/agent/observation";
import { decideFromStepObservation } from "@/lib/agent/decision";
import {
  classifyAgentFailure,
  policyForFailure,
} from "@/lib/agent-orchestrator/failure-classification";
import {
  ORCHESTRATOR_LOOP_BUDGET,
  appendContextObservation,
  type AgentExecutionContext,
  type AgentExecutionResult,
} from "@/lib/agent-orchestrator/execution-context";
import { traceEvent } from "@/lib/agent-orchestrator/agent-trace";
import { ensureSessionGraph } from "@/lib/graph-command/session-graph-store";
import type { AgentObservation } from "@/lib/agent/types";
import {
  finalizeCapabilityExecution,
  recordAgentCompositeExecution,
} from "@/lib/capability-ledger/record-capability-execution";
import {
  computeOutputQuality,
  computeUsageWeight,
  deriveExecutionStatus,
} from "@/lib/capability-ledger/usage-weight";
import { decideSpawnRealityTaskFromTool } from "@/lib/reality-data-network/spawn-reality-task";

export type ObserveDecideLoopInput = {
  readonly ctx: AgentExecutionContext;
  readonly toolChain: readonly RimvioToolId[];
  readonly maxIterations?: number;
};

function verifyObservation(input: {
  readonly observation: AgentObservation;
  readonly toolId: RimvioToolId;
}): boolean {
  if (input.toolId === "booking.prepare") {
    return input.observation.stepKind === "wait_commit" || input.observation.success;
  }
  if (input.toolId === "hotel.lookup" || input.toolId === "restaurant.lookup") {
    return (
      (input.observation.candidates?.length ?? 0) > 0 ||
      input.observation.errors?.includes("empty_candidates") === true
    );
  }
  return input.observation.success;
}

export async function runObserveDecideLoop(
  input: ObserveDecideLoopInput,
): Promise<AgentExecutionResult> {
  const maxIterations =
    input.maxIterations ?? ORCHESTRATOR_LOOP_BUDGET.MAX_AGENT_ITERATIONS;
  let ctx = input.ctx;
  let chainIndex = 0;
  let retries = 0;

  ensureSessionGraph({ contextEventId: ctx.task.contextEventId });

  let trace = traceEvent(ctx.trace, "task.started", ctx.task.label, {
    taskId: ctx.task.nodeId,
    agentId: ctx.task.agentId,
  });

  let compositeExecutionId = ctx.compositeExecutionId ?? null;
  if (!compositeExecutionId) {
    const composite = recordAgentCompositeExecution({
      agentId: ctx.task.agentId,
      userRequestId: ctx.task.contextEventId,
      contextEventId: ctx.task.contextEventId,
    });
    compositeExecutionId = composite.executionId;
    ctx = { ...ctx, compositeExecutionId };
    trace = traceEvent(trace, "capability.composite", composite.executionId, {
      taskId: ctx.task.nodeId,
      agentId: ctx.task.agentId,
    });
  }

  while (ctx.iteration < maxIterations) {
    ctx = { ...ctx, iteration: ctx.iteration + 1, trace };

    if (chainIndex >= input.toolChain.length) {
      const last = ctx.observations[ctx.observations.length - 1];
      if (!last) {
        return {
          status: "blocked",
          observation: {
            planId: ctx.task.nodeId,
            stepId: ctx.task.nodeId,
            stepKind: "blocked",
            success: false,
            errors: ["no_observations"],
          },
          observations: ctx.observations,
          reason: "관찰 없음",
          trace,
        };
      }
      trace = traceEvent(trace, "task.completed", "tool chain done", {
        taskId: ctx.task.nodeId,
        agentId: ctx.task.agentId,
      });
      return {
        status: "completed",
        observation: last,
        observations: ctx.observations,
        trace,
      };
    }

    const toolId = input.toolChain[chainIndex]!;
    trace = traceEvent(trace, "tool.called", toolId, {
      taskId: ctx.task.nodeId,
      agentId: ctx.task.agentId,
      toolId,
    });

    const tool = await invokeRimvioToolAsync(toolId, {
      contextEventId: ctx.task.contextEventId,
      utterance: ctx.conversation.utterance,
      contextLabelKo: String(ctx.task.parameters?.entityLabelKo ?? ctx.task.label),
      ledgerContext: {
        userRequestId: ctx.task.contextEventId,
        contextEventId: ctx.task.contextEventId,
        agentId: ctx.task.agentId,
        parentExecutionId: compositeExecutionId,
      },
    });

    const observation = normalizeToolInvokeResult({
      planId: ctx.task.contextEventId,
      stepId: `${ctx.task.nodeId}:${toolId}`,
      stepKind: toolId.includes("lookup") || toolId === "maps.search" ? "resolve_entity" : "tool",
      tool,
    });

    trace = traceEvent(trace, "observation.created", observation.summaryKo ?? toolId, {
      taskId: ctx.task.nodeId,
      toolId,
    });

    ctx = appendContextObservation(ctx, observation);

    const verified = verifyObservation({ observation, toolId });
    trace = traceEvent(
      trace,
      "verification.completed",
      verified ? "pass" : "fail",
      { taskId: ctx.task.nodeId, toolId },
    );

    const ledgerExecutionId =
      typeof tool.meta?.ledgerExecutionId === "string"
        ? tool.meta.ledgerExecutionId
        : null;
    if (ledgerExecutionId) {
      const weightInput = {
        toolId,
        toolOk: tool.ok,
        candidateCount: tool.candidates?.length ?? 0,
        waitingCommit: tool.waitingCommit,
        verified,
        pickedId: tool.pickedId ?? null,
      };
      finalizeCapabilityExecution({
        executionId: ledgerExecutionId,
        executionStatus: deriveExecutionStatus(weightInput),
        outputQuality: computeOutputQuality(weightInput),
        usageWeight: computeUsageWeight(weightInput),
        verified,
      });
    }

    if (!verified && toolId === "hotel.lookup") {
      const spawnDecision = decideSpawnRealityTaskFromTool({
        toolId,
        tool,
        contextEventId: ctx.task.contextEventId,
        verified,
      });
      if (spawnDecision.type === "spawn_reality_task") {
        trace = traceEvent(
          trace,
          "reality.task.spawned",
          `${spawnDecision.tasks.length} photo_authenticity`,
          {
            taskId: ctx.task.nodeId,
            toolId,
            spawnReason: spawnDecision.reason,
          },
        );
      }
    }

    if (toolId === "booking.prepare") {
      trace = traceEvent(trace, "human_commit_requested", "booking.prepare — no auto commit", {
        taskId: ctx.task.nodeId,
      });
      return {
        status: "needs_user",
        observation: { ...observation, stepKind: "wait_commit" },
        observations: ctx.observations,
        reason: "Human Approval 필요",
        trace,
      };
    }

    if (!verified || !observation.success) {
      const failureClass = classifyAgentFailure({ observation, tool });
      const policy = policyForFailure(failureClass);

      if (policy === "commit_gate") {
        return {
          status: "needs_user",
          observation,
          observations: ctx.observations,
          reason: "Human Commit gate",
          trace,
        };
      }

      if (policy === "ask_user") {
        return {
          status: "needs_user",
          observation,
          observations: ctx.observations,
          reason: observation.summaryKo ?? "사용자 입력 필요",
          trace,
        };
      }

      if (policy === "retry" && retries < 2) {
        retries += 1;
        continue;
      }

      if (policy === "alternative_search" || policy === "replan") {
        const decision = await decideFromStepObservation({
          observation,
          utterance: ctx.conversation.utterance,
          useLlm: false,
        });
        if (decision.type === "refine" || decision.type === "replan") {
          trace = traceEvent(trace, "replan.started", failureClass, {
            taskId: ctx.task.nodeId,
          });
          ctx = { ...ctx, replanCount: ctx.replanCount + 1, trace };
          if (ctx.replanCount > ORCHESTRATOR_LOOP_BUDGET.MAX_REPLANS) {
            return {
              status: "blocked",
              observation,
              observations: ctx.observations,
              reason: "Replan 한도 초과",
              trace,
            };
          }
          continue;
        }
      }

      if (policy === "explain_failure") {
        return {
          status: "blocked",
          observation,
          observations: ctx.observations,
          reason: observation.summaryKo ?? "실패",
          trace,
        };
      }
    }

    chainIndex += 1;
    retries = 0;
    trace = traceEvent(trace, "tool.completed", toolId, {
      taskId: ctx.task.nodeId,
      toolId,
    });
  }

  const last = ctx.observations[ctx.observations.length - 1];
  trace = traceEvent(trace, "blocked", "iteration budget exceeded", {
    taskId: ctx.task.nodeId,
  });
  return {
    status: "blocked",
    observation:
      last ?? {
        planId: ctx.task.nodeId,
        stepId: ctx.task.nodeId,
        stepKind: "blocked",
        success: false,
        errors: ["max_iterations"],
      },
    observations: ctx.observations,
    reason: "반복 한도 초과",
    trace,
  };
}
