import type {
  ExperienceRunClarify,
  ExperienceRunSummary,
} from "@/lib/experience-run/experience-run-types";
import { copy } from "@/lib/copy/human-ko";
import {
  dispatchExecutionFeedArtifact,
  dispatchExecutionFeedStep,
} from "@/lib/context-run/execution-feed-bridge";
import { resolveActiveComposerGraphId } from "@/lib/context-run/resolve-active-composer-graph-id";

const STEP_RUN = "experience_run";

export function syncExperienceRunClarifyToFeed(
  clarify: ExperienceRunClarify,
  goalKo: string,
): void {
  const graphId = resolveActiveComposerGraphId(goalKo);

  dispatchExecutionFeedStep({
    graphId,
    stepId: STEP_RUN,
    labelKo: copy.globe.executionFeed.runClarifyStep,
    status: "waiting_user",
  });

  dispatchExecutionFeedArtifact({
    graphId,
    stepId: STEP_RUN,
    artifact: {
      kind: "question",
      titleKo: copy.globe.executionFeed.runClarifyTitle,
      summaryLineKo: clarify.questionKo,
      bodyKo: goalKo,
    },
  });
}

export function syncExperienceRunSummaryToFeed(
  summary: ExperienceRunSummary,
  goalKo: string,
): void {
  const graphId = resolveActiveComposerGraphId(goalKo);

  for (const step of summary.steps) {
    if (step.status === "skipped") {
      continue;
    }
    dispatchExecutionFeedStep({
      graphId,
      stepId: step.id,
      labelKo: step.labelKo,
      status: step.status === "done" ? "done" : "running",
      resultKo: step.status === "done" ? step.labelKo : null,
    });
  }

  dispatchExecutionFeedStep({
    graphId,
    stepId: STEP_RUN,
    labelKo: summary.titleKo,
    status: "done",
    resultKo: summary.titleKo.slice(0, 28),
  });

  const metrics = [
    summary.lodgingCount != null && summary.lodgingCount > 0
      ? {
          id: "lodging",
          labelKo: copy.globe.executionFeed.runLodgingMetric,
          valueKo: `${summary.lodgingCount}`,
          hintKo: summary.topLodgingName ?? null,
          tone: "positive" as const,
        }
      : null,
    summary.eateryCount != null && summary.eateryCount > 0
      ? {
          id: "eatery",
          labelKo: copy.globe.executionFeed.runEateryMetric,
          valueKo: `${summary.eateryCount}`,
          hintKo: summary.topEateryName ?? null,
          tone: "positive" as const,
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row != null);

  dispatchExecutionFeedArtifact({
    graphId,
    stepId: STEP_RUN,
    artifact: {
      kind: "result",
      titleKo: summary.titleKo,
      summaryLineKo: summary.meaningLineKo || summary.bodyKo,
      bodyKo: summary.bodyKo,
      metrics: metrics.length > 0 ? metrics : undefined,
      checklist: summary.steps
        .filter((step) => step.status !== "skipped")
        .map((step) => ({
          id: step.id,
          titleKo: step.labelKo,
          done: step.status === "done",
          priorityKo:
            step.status === "done"
              ? copy.globe.executionFeed.checklistDone
              : null,
          priorityTone: step.status === "done" ? "low" : undefined,
        })),
      tabs: [
        { id: "summary", labelKo: copy.globe.executionFeed.runTabSummary },
        { id: "steps", labelKo: copy.globe.executionFeed.runTabSteps },
      ],
      activeTabId: "summary",
    },
  });
}
