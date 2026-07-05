/**
 * Project Globe Ingress compile output onto Reality Surface bands only.
 * Blueprint stays off-surface — only flow/runtime/bridge/context projection.
 */

import type { ExecutionGraph } from "@/lib/context-blueprint/execution-graph";
import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import type { GlobeIngressCompileResult } from "@/lib/globe-ingress/types";
import {
  composeRealitySurfaceProjectionBundle,
  type RealitySurfaceProjectionBundle,
} from "@/lib/reality-surface/types";

function readActiveFlowNode(graph: ExecutionGraph | null | undefined) {
  if (!graph?.nodes.length) {
    return null;
  }
  return (
    graph.nodes.find(
      (node) => node.status === "running" || node.status === "ready",
    ) ??
    graph.nodes.find((node) => node.status === "pending") ??
    graph.nodes[0] ??
    null
  );
}

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
};

export function composeRealitySurfaceFromBlueprint(input: {
  eventId: string;
  goalKo: string;
  bridgePathLabels: readonly string[];
  blueprint: ContextBlueprint;
  runtimeId: string;
}): RealitySurfaceSession {
  const graph = input.blueprint.executionGraph;
  const activeNode = readActiveFlowNode(graph);
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
  };
}

export function composeRealitySurfaceFromGlobeIngress(input: {
  compiled: GlobeIngressCompileResult;
  eventId: string;
}): RealitySurfaceSession {
  const { compiled, eventId } = input;
  return composeRealitySurfaceFromBlueprint({
    eventId,
    goalKo: compiled.context.goal,
    bridgePathLabels: compiled.bridge.pathLabels,
    blueprint: compiled.blueprint,
    runtimeId: compiled.runtime.runtimeId,
  });
}
