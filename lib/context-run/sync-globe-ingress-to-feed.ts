import type { GlobeIngressCompileResult } from "@/lib/globe-ingress/types";
import {
  dispatchExecutionFeedArtifact,
  dispatchExecutionFeedStep,
} from "@/lib/context-run/execution-feed-bridge";
import { resolveActiveComposerGraphId } from "@/lib/context-run/resolve-active-composer-graph-id";

const STEP_INGRESS = "globe_ingress";

export function syncGlobeIngressCompileToFeed(
  compiled: GlobeIngressCompileResult,
  goalKo: string,
): void {
  const graphId = resolveActiveComposerGraphId(goalKo);
  const steps = [
    { id: "context", labelKo: "맥락", detailKo: compiled.context.goal },
    {
      id: "bridge",
      labelKo: "연결",
      detailKo: compiled.bridge.pathLabels.join(" → "),
    },
    {
      id: "runtime",
      labelKo: "실행",
      detailKo: compiled.runtime.runtimeKind,
    },
    {
      id: "blueprint",
      labelKo: "설계",
      detailKo:
        compiled.blueprint.resourcePlan.nextQuestion?.promptKo ??
        compiled.blueprint.goal,
    },
  ] as const;

  for (const step of steps) {
    dispatchExecutionFeedStep({
      graphId,
      stepId: `${STEP_INGRESS}:${step.id}`,
      labelKo: step.labelKo,
      status: "done",
      resultKo: step.detailKo.slice(0, 40),
    });
  }

  dispatchExecutionFeedStep({
    graphId,
    stepId: STEP_INGRESS,
    labelKo: "실행 구조 설계",
    status: "done",
    resultKo: compiled.context.goal.slice(0, 28),
  });

  dispatchExecutionFeedArtifact({
    graphId,
    stepId: STEP_INGRESS,
    artifact: {
      kind: "result",
      titleKo: compiled.context.goal,
      summaryLineKo: compiled.bridge.pathLabels.join(" → "),
      bodyKo: compiled.blueprint.resourcePlan.nextQuestion?.promptKo ?? "",
      checklist: steps.map((step) => ({
        id: step.id,
        titleKo: step.labelKo,
        done: true,
        priorityKo: step.detailKo.slice(0, 24),
        priorityTone: "low" as const,
      })),
      tabs: [
        { id: "structure", labelKo: "구조" },
        { id: "flow", labelKo: "흐름" },
      ],
      activeTabId: "structure",
    },
  });
}
