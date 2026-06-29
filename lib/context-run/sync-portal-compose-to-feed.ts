import { copy } from "@/lib/copy/human-ko";
import {
  dispatchExecutionFeedArtifact,
  dispatchExecutionFeedGoal,
  dispatchExecutionFeedStep,
} from "@/lib/context-run/execution-feed-bridge";
import type { PortalIntentId } from "@/lib/portal/portal-types";
import { getPortalIntent } from "@/lib/portal/portal-intent-registry";

const STEP_PORTAL = "portal_compose";

export function syncPortalComposeStartToFeed(input: {
  graphId: string;
  goalKo: string;
  intentId: PortalIntentId;
}): void {
  dispatchExecutionFeedGoal({ graphId: input.graphId, goalKo: input.goalKo });
  const intent = getPortalIntent(input.intentId);
  dispatchExecutionFeedStep({
    graphId: input.graphId,
    stepId: STEP_PORTAL,
    labelKo: intent?.labelKo ?? copy.portal.composeRunStep,
    status: "running",
  });
}

export function syncPortalComposeClarifyToFeed(input: {
  graphId: string;
  questionKo: string;
  goalKo: string;
  slotId: string;
}): void {
  dispatchExecutionFeedStep({
    graphId: input.graphId,
    stepId: STEP_PORTAL,
    labelKo: copy.portal.composeRunClarifyStep,
    status: "waiting_user",
  });
  dispatchExecutionFeedArtifact({
    graphId: input.graphId,
    stepId: STEP_PORTAL,
    artifact: {
      kind: "question",
      titleKo: copy.portal.composeRunClarifyTitle,
      summaryLineKo: input.questionKo,
      bodyKo: input.goalKo,
      checklist: [
        {
          id: input.slotId,
          titleKo: input.questionKo,
          done: false,
          priorityKo: copy.globe.executionFeed.checklistActive,
        },
      ],
    },
  });
}

export function syncPortalComposeSocialSummaryToFeed(input: {
  graphId: string;
  titleKo: string;
  summaryKo: string;
  intentId: PortalIntentId;
}): void {
  dispatchExecutionFeedStep({
    graphId: input.graphId,
    stepId: STEP_PORTAL,
    labelKo: copy.portal.composeRunDoneStep,
    status: "done",
    resultKo: input.titleKo.slice(0, 28),
  });
  dispatchExecutionFeedArtifact({
    graphId: input.graphId,
    stepId: STEP_PORTAL,
    artifact: {
      kind: "result",
      titleKo: input.titleKo,
      summaryLineKo: input.summaryKo,
      bodyKo: input.summaryKo,
      tabs: [{ id: "summary", labelKo: copy.globe.executionFeed.runTabSummary }],
      activeTabId: "summary",
    },
  });
}

export function syncPortalComposeWizardLaunchToFeed(input: {
  graphId: string;
  productLabel: string | null;
  intentId: PortalIntentId;
}): void {
  const intent = getPortalIntent(input.intentId);
  dispatchExecutionFeedStep({
    graphId: input.graphId,
    stepId: STEP_PORTAL,
    labelKo: copy.portal.composeRunWizardStep,
    status: "running",
    resultKo: input.productLabel,
  });
  dispatchExecutionFeedArtifact({
    graphId: input.graphId,
    stepId: STEP_PORTAL,
    artifact: {
      kind: "checklist",
      titleKo: copy.portal.composeRunWizardTitle(intent?.labelKo ?? ""),
      summaryLineKo: input.productLabel
        ? copy.globe.executionFeed.marketProductSummary(input.productLabel)
        : copy.globe.executionFeed.marketPortalHint,
      checklist: [
        {
          id: "wizard",
          titleKo: copy.portal.composeRunWizardChecklist,
          done: false,
          priorityKo: copy.globe.executionFeed.checklistActive,
        },
      ],
      tabs: [
        { id: "checklist", labelKo: copy.globe.executionFeed.marketTabChecklist },
      ],
      activeTabId: "checklist",
    },
  });
}
