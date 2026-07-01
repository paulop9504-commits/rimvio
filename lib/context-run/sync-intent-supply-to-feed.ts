import {
  dispatchExecutionFeedArtifact,
  dispatchExecutionFeedStep,
} from "@/lib/context-run/execution-feed-bridge";
import { resolveActiveComposerGraphId } from "@/lib/context-run/resolve-active-composer-graph-id";
import type {
  GlobeMapIntentSupplyAck,
  GlobeMapIntentSupplyPending,
} from "@/lib/globe/intent-supply/globe-map-intent-types";

const STEP_CONNECT = "intent_connect";

export function syncIntentSupplyPendingToFeed(
  pending: GlobeMapIntentSupplyPending,
  goalKo: string,
): void {
  const graphId = resolveActiveComposerGraphId(goalKo);
  dispatchExecutionFeedStep({
    graphId,
    stepId: STEP_CONNECT,
    labelKo: pending.intentLabelKo,
    status: "running",
  });
  dispatchExecutionFeedArtifact({
    graphId,
    stepId: STEP_CONNECT,
    artifact: {
      kind: "progress",
      titleKo: pending.intentLabelKo,
      bodyKo: goalKo,
      sources: pending.signalChips.map((chip, index) => ({
        id: `chip-${index}`,
        labelKo: chip,
        icon: "memory",
      })),
    },
  });
}

export function syncIntentSupplyAckToFeed(
  ack: GlobeMapIntentSupplyAck,
  goalKo: string,
): void {
  const graphId = resolveActiveComposerGraphId(goalKo);
  dispatchExecutionFeedStep({
    graphId,
    stepId: STEP_CONNECT,
    labelKo: ack.intentLabelKo,
    status: "done",
    resultKo: ack.summaryKo.slice(0, 40),
  });
  dispatchExecutionFeedArtifact({
    graphId,
    stepId: STEP_CONNECT,
    artifact: {
      kind: "result",
      titleKo: ack.intentLabelKo,
      summaryLineKo: ack.summaryKo,
      sources: ack.signalChips.map((chip, index) => ({
        id: `chip-${index}`,
        labelKo: chip,
        icon: "map",
      })),
      metrics:
        ack.suppliedResourceCount > 0
          ? [
              {
                id: "resources",
                labelKo: "연결된 자원",
                valueKo: `${ack.suppliedResourceCount}개`,
                tone: "positive",
              },
            ]
          : undefined,
    },
  });
}
