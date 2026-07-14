/**
 * Project Globe Ingress compile output onto Reality Surface bands only.
 * Blueprint stays off-surface — only flow/runtime/bridge/context projection.
 */

import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import { buildContextExecutionPlanFromBlueprint } from "@/lib/context-execution/build-context-execution-plan";
import { resolveContextExecutionPlanApprovalGate } from "@/lib/context-execution/resolve-plan-approval-gate";
import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";
import { readActiveExecutionGraphNode } from "@/lib/context-execution/read-active-plan-step";
import type { GlobeIngressCompileResult } from "@/lib/globe-ingress/types";
import {
  composeRealitySurfaceProjectionBundle,
  type RealitySurfaceProjectionBundle,
} from "@/lib/reality-surface/types";

function resolveBridgeActiveLegIndex(input: {
  pathLabels: readonly string[];
  activeNodeLabel: string | null;
  destinationConfirmed?: boolean;
}): number {
  if (input.destinationConfirmed) {
    const stayIndex = input.pathLabels.findIndex(
      (label) => label !== "집" && label !== "공항" && label !== "호텔" && label !== "Stay region",
    );
    if (stayIndex >= 0) {
      return stayIndex;
    }
  }
  if (!input.activeNodeLabel) {
    return 0;
  }
  const index = input.pathLabels.findIndex(
    (label) =>
      label.includes(input.activeNodeLabel!) ||
      input.activeNodeLabel!.includes(label),
  );
  return index >= 0 ? index : 0;
}

/** Reality Surface session — projection for UX; blueprint for Operator gate only. */
export type RealitySurfaceSession = {
  readonly eventId: string;
  readonly projection: RealitySurfaceProjectionBundle;
  /** Operator gate only — never render on globe */
  readonly operatorBlueprint: ContextBlueprint;
  /** L3 Execution Plan instance — Runtime step state (off globe hero). */
  readonly executionPlan?: ContextExecutionPlanV1 | null;
};

export function composeRealitySurfaceFromBlueprint(input: {
  eventId: string;
  goalKo: string;
  bridgePathLabels: readonly string[];
  blueprint: ContextBlueprint;
  runtimeId: string;
  executionPlan?: ContextExecutionPlanV1 | null;
}): RealitySurfaceSession {
  const graph = input.blueprint.executionGraph;
  const activeNode = readActiveExecutionGraphNode({
    graph,
    plan: input.executionPlan ?? null,
  });
  const flowNodeIds = graph?.nodes.map((node) => node.id) ?? [];
  const activePhaseLabel = activeNode?.label ?? null;
  const destinationConfirmed = !input.blueprint.resourcePlan.emptySlots.includes(
    "destination",
  );

  const projection = composeRealitySurfaceProjectionBundle({
    context: {
      contextId: input.eventId,
      goalKo: input.goalKo,
    },
    bridge: {
      pathLabels: input.bridgePathLabels,
      activeLegIndex: resolveBridgeActiveLegIndex({
        pathLabels: input.bridgePathLabels,
        activeNodeLabel: activePhaseLabel,
        destinationConfirmed,
      }),
    },
    runtime: {
      runtimeId: input.runtimeId,
      activePhaseLabel,
      activeFlowNodeId: activeNode?.id ?? null,
      progressHintKo: input.blueprint.resourcePlan.nextQuestion?.promptKo ?? null,
    },
    flow: {
      flowNodeIds,
      nextStepHintKo: input.blueprint.resourcePlan.nextQuestion?.promptKo ?? null,
      strokeStyle:
        destinationConfirmed || activeNode?.resolution === "confirmed"
          ? "solid"
          : "dashed",
    },
  });

  return {
    eventId: input.eventId,
    projection,
    operatorBlueprint: input.blueprint,
    executionPlan: input.executionPlan ?? null,
  };
}

export function composeRealitySurfaceFromGlobeIngress(input: {
  compiled: GlobeIngressCompileResult;
  eventId: string;
}): RealitySurfaceSession {
  const { compiled, eventId } = input;
  const executionPlan = resolveContextExecutionPlanApprovalGate({
    plan: buildContextExecutionPlanFromBlueprint({
      blueprint: compiled.blueprint,
      build: {
        contextId: eventId,
        goalKo: compiled.context.goal,
        osPhase: "execution_planned",
        approval: "auto",
      },
    }),
    blueprint: compiled.blueprint,
  });
  return composeRealitySurfaceFromBlueprint({
    eventId,
    goalKo: compiled.context.goal,
    bridgePathLabels: compiled.bridge.pathLabels,
    blueprint: compiled.blueprint,
    runtimeId: compiled.runtime.runtimeId,
    executionPlan,
  });
}
