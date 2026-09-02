/**
 * Run composite loop through Tool Loop — updates Goal State pipeline.
 */

import type { CompositeLoopResult, ToolLoopStepLog } from "../types";
import { getCompositeLoop } from "../composite/osaka-loops";
import {
  initGoalPipeline,
  advanceGoalPipeline,
  readPersistedGoalState,
} from "../persistence/goal-state";
import { isBrowserCapability } from "../runner-registry";
import { ingestHotelSearchSandboxOutput } from "../runners/mutation-runners";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { invokePublishedCapability } from "./invoke";
import { runToolLoop } from "./tool-loop";

export async function runCompositeLoop(input: {
  readonly loopId: string;
  readonly contextEventId: string;
  readonly userRequest?: string;
  readonly startStepIndex?: number;
  readonly platformId?: string;
}): Promise<CompositeLoopResult> {
  const loop = getCompositeLoop(input.loopId);
  if (!loop) {
    return {
      ok: false,
      loopId: input.loopId,
      goalKo: "unknown loop",
      stepsCompleted: 0,
      totalSteps: 0,
      goalPercent: 0,
      logs: [],
      lastInvoke: null,
      workLogKo: `Loop 없음: ${input.loopId}`,
    };
  }

  const startIndex = input.startStepIndex ?? 0;
  const pipelineIds = loop.steps.map((s) => s.capabilityId);

  initGoalPipeline({
    contextEventId: input.contextEventId,
    goalKo: loop.goalKo,
    pipelineCapabilityIds: pipelineIds,
    compositeLoopId: loop.loopId,
    stepIndex: startIndex,
    utterance: input.userRequest ?? loop.goalKo,
  });

  const logs: ToolLoopStepLog[] = [];
  let lastInvoke = null;
  let stepsCompleted = startIndex;

  for (let i = startIndex; i < loop.steps.length; i += 1) {
    const step = loop.steps[i]!;
    let stepInput: Record<string, unknown> = {
      ...(step.input ?? {}),
      workspaceId: input.contextEventId,
    };

    if (step.capabilityId === "workspace.entity.select" && !stepInput.entityId) {
      const ws = readContextWorkspace(input.contextEventId);
      const lodging = ws?.nodes.find((node) => node.kind === "lodging");
      if (lodging) {
        stepInput = { ...stepInput, entityId: lodging.id };
      }
    }

    const browserStep = isBrowserCapability(step.capabilityId);
    const invokeInput = {
      capabilityId: step.capabilityId,
      input: stepInput,
      userRequest: input.userRequest ?? `${loop.goalKo} · ${step.labelKo ?? step.capabilityId}`,
      contextEventId: input.contextEventId,
      platformId: input.platformId,
      syncGoal: false,
      toolLoop: !browserStep,
      waitForSandbox: browserStep,
      sandboxTimeoutMs: browserStep ? 120_000 : undefined,
    };

    const result = isBrowserCapability(step.capabilityId)
      ? await invokePublishedCapability(invokeInput)
      : await runToolLoop(invokeInput);

    logs.push(...(("logs" in result ? result.logs : []) as ToolLoopStepLog[]));
    logs.push({
      phase: result.ok ? "complete" : "invoke",
      capabilityId: step.capabilityId,
      ok: result.ok,
      detailKo: step.labelKo ?? result.workLogKo,
    });

    lastInvoke = result;
    if (
      browserStep &&
      step.capabilityId === "hotel.search" &&
      result.ok &&
      result.output
    ) {
      ingestHotelSearchSandboxOutput(input.contextEventId, result.output);
    }

    if (!result.ok && !result.prepareOnly) {
      advanceGoalPipeline({
        contextEventId: input.contextEventId,
        stepIndex: i,
        capabilityId: step.capabilityId,
        executionId: result.executionId,
        ok: false,
      });
      const goal = readPersistedGoalState(input.contextEventId);
      return {
        ok: false,
        loopId: loop.loopId,
        goalKo: loop.goalKo,
        stepsCompleted: i,
        totalSteps: loop.steps.length,
        goalPercent: goal?.percent ?? 0,
        logs,
        lastInvoke: result,
        workLogKo: `${loop.goalKo} · ${step.capabilityId} 실패`,
      };
    }

    stepsCompleted = i + 1;
    advanceGoalPipeline({
      contextEventId: input.contextEventId,
      stepIndex: i,
      capabilityId: step.capabilityId,
      executionId: result.executionId,
      ok: true,
    });
  }

  const goal = readPersistedGoalState(input.contextEventId);
  return {
    ok: true,
    loopId: loop.loopId,
    goalKo: loop.goalKo,
    stepsCompleted,
    totalSteps: loop.steps.length,
    goalPercent: goal?.percent ?? 100,
    logs,
    lastInvoke,
    workLogKo: `${loop.goalKo} · ${stepsCompleted}/${loop.steps.length} 완료 · ${goal?.percent ?? 100}%`,
  };
}

export async function resumeCompositeLoop(input: {
  readonly contextEventId: string;
  readonly userRequest?: string;
  readonly platformId?: string;
}): Promise<CompositeLoopResult | null> {
  const goal = readPersistedGoalState(input.contextEventId);
  if (!goal?.compositeLoopId) return null;

  const stepIndex = goal.pipelineStepIndex ?? goal.completedCapabilityIds.length;
  return runCompositeLoop({
    loopId: goal.compositeLoopId,
    contextEventId: input.contextEventId,
    userRequest: input.userRequest ?? goal.utterance ?? undefined,
    startStepIndex: stepIndex,
    platformId: input.platformId,
  });
}
