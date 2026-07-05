import type { BridgePlanningTruthV1 } from "@/lib/bridge-planning/types";
import { composeRealitySurfaceProjectionBundle } from "@/lib/reality-surface/types";

/** Reality Surface projection from Bridge planning truth — no Blueprint. */
export function composeRealitySurfaceFromBridgeTruth(input: {
  eventId: string;
  truth: BridgePlanningTruthV1;
  goalKo?: string | null;
}) {
  const goalKo = input.goalKo?.trim() || input.truth.goalKo?.trim() || input.truth.destination.label;
  const activePhaseLabel = "Stay";

  return composeRealitySurfaceProjectionBundle({
    context: {
      contextId: input.eventId,
      goalKo,
    },
    bridge: {
      pathLabels: input.truth.pathLabels,
      activeLegIndex: input.truth.pinnedLegIndex,
    },
    runtime: {
      runtimeId: null,
      activePhaseLabel,
      activeFlowNodeId: "stay",
      progressHintKo: `${input.truth.destination.label}에서 묵을 곳을 찾을까요?`,
    },
    flow: {
      flowNodeIds: ["trip", "prepare", "departure", "arrival", "stay"],
      nextStepHintKo: `${input.truth.destination.label}에서 묵을 곳을 찾을까요?`,
      strokeStyle: input.truth.flowStrokeStyle ?? "solid",
    },
  });
}
