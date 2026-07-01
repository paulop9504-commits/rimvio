import { buildMarketQuickListDraft } from "@/lib/globe/market/build-market-quick-list-draft";
import { normalizeMarketIntentFromText } from "@/lib/globe/market/normalize-market-intent-from-text";
import { readMarketComposeQuery } from "@/lib/globe/market/detect-market-compose-input";
import { copy } from "@/lib/copy/human-ko";
import {
  buildMarketWizardChecklist,
  marketWizardDefaultActiveStep,
} from "@/lib/context-run/build-market-wizard-checklist";
import {
  dispatchExecutionFeedArtifact,
  dispatchExecutionFeedGoal,
  dispatchExecutionFeedStep,
  readExecutionFeedState,
} from "@/lib/context-run/execution-feed-bridge";
import { buildComposerGraphId } from "@/lib/context-run/resolve-globe-composer-surface";
import {
  marketWizardProgress,
  marketWizardSteps,
  type MarketWizardStepId,
} from "@/lib/globe/market/market-intent-wizard-flow";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";

const STEP_MARKET = "market_compose";

function readComposeBody(text: string): string {
  const query = readMarketComposeQuery(text);
  return (query || text.replace(/^@\S+\s*/u, "")).trim() || text.trim();
}

function inferMarketRole(composeText: string): MarketIntentRole {
  const body = readComposeBody(composeText);
  const normalized = normalizeMarketIntentFromText({
    text: body,
    eventId: "probe",
  });
  return normalized?.role ?? "listing";
}

function readProductLabel(composeText: string, eventId: string): string | null {
  const draft = buildMarketQuickListDraft({ text: composeText, eventId });
  const name = draft?.detail.productName?.trim();
  return name || null;
}

function pushMarketArtifact(input: {
  graphId: string;
  composeText: string;
  role: MarketIntentRole;
  activeStep: MarketWizardStepId;
  completedThroughStep?: MarketWizardStepId | null;
  summaryLineKo?: string | null;
  quickList?: boolean;
  activeTabId?: string;
  primaryActionLabelKo?: string | null;
}) {
  const progress = marketWizardProgress(input.role, input.activeStep, {
    skipRole: true,
  });
  const checklist = buildMarketWizardChecklist({
    role: input.role,
    skipRole: true,
    activeStep: input.activeStep,
    completedThroughStep: input.completedThroughStep ?? null,
  });

  dispatchExecutionFeedArtifact({
    graphId: input.graphId,
    stepId: STEP_MARKET,
    artifact: {
      kind: "checklist",
      titleKo: copy.globe.executionFeed.marketChecklistTitle,
      summaryLineKo: input.summaryLineKo ?? null,
      checklist,
      tabs: [
        { id: "checklist", labelKo: copy.globe.executionFeed.marketTabChecklist },
        { id: "prep", labelKo: copy.globe.executionFeed.marketTabPrep },
      ],
      activeTabId: input.activeTabId ?? "checklist",
      primaryActionLabelKo: input.primaryActionLabelKo ?? null,
      metrics: [
        {
          id: "progress",
          labelKo: copy.globe.executionFeed.marketProgressLabel,
          valueKo: copy.globe.marketWizardProgress(progress.current, progress.total),
          tone: "neutral",
        },
        ...(input.quickList
          ? [
              {
                id: "fast",
                labelKo: copy.globe.executionFeed.marketFastPathLabel,
                valueKo: copy.globe.executionFeed.marketFastPathValue,
                tone: "positive" as const,
              },
            ]
          : []),
      ],
    },
  });
}

/** Portal / wizard path — show checklist artifact before sheet opens. */
export function syncMarketComposeStartToFeed(input: {
  composeText: string;
  eventId?: string | null;
}): string {
  const composeText = input.composeText.trim();
  const graphId = buildComposerGraphId(input.eventId, composeText);
  const role = inferMarketRole(composeText);
  const activeStep = marketWizardDefaultActiveStep(role, { skipRole: true });
  const product = readProductLabel(composeText, input.eventId?.trim() || "probe");

  dispatchExecutionFeedGoal({ graphId, goalKo: composeText });

  dispatchExecutionFeedStep({
    graphId,
    stepId: STEP_MARKET,
    labelKo: copy.globe.executionFeed.marketStepPrep,
    status: "running",
  });

  pushMarketArtifact({
    graphId,
    composeText,
    role,
    activeStep,
    summaryLineKo: product
      ? copy.globe.executionFeed.marketProductSummary(product)
      : copy.globe.executionFeed.marketPortalHint,
    primaryActionLabelKo: copy.globe.executionFeed.marketFeedWizardCta,
  });

  return graphId;
}

/** Live wizard step → Execution Feed checklist (portal open). */
export function syncMarketWizardStepToFeed(input: {
  composeText: string;
  eventId?: string | null;
  role: MarketIntentRole;
  activeStep: MarketWizardStepId;
  portalLaunch?: boolean;
  activeTabId?: string;
  completedThroughStep?: MarketWizardStepId | null;
}): string {
  const composeText = input.composeText.trim();
  const graphId = buildComposerGraphId(input.eventId, composeText);
  const steps = marketWizardSteps(input.role, {
    skipRole: input.portalLaunch ?? true,
  });
  const activeIndex = steps.indexOf(input.activeStep);
  const completedThroughStep =
    input.completedThroughStep ??
    (activeIndex > 0 ? steps[activeIndex - 1]! : null);
  const product = readProductLabel(composeText, input.eventId?.trim() || "probe");

  const feed = readExecutionFeedState();
  if (!feed.run || feed.run.graphId !== graphId) {
    dispatchExecutionFeedGoal({ graphId, goalKo: composeText });
  }

  dispatchExecutionFeedStep({
    graphId,
    stepId: STEP_MARKET,
    labelKo: copy.globe.executionFeed.marketStepPrep,
    status: "running",
  });

  pushMarketArtifact({
    graphId,
    composeText,
    role: input.role,
    activeStep: input.activeStep,
    completedThroughStep,
    activeTabId: input.activeTabId,
    summaryLineKo: product
      ? copy.globe.executionFeed.marketProductSummary(product)
      : copy.globe.executionFeed.marketPortalHint,
    primaryActionLabelKo: copy.globe.executionFeed.marketFeedWizardCta,
  });

  return graphId;
}

export function syncMarketQuickListStartToFeed(input: {
  composeText: string;
  eventId?: string | null;
}): void {
  const graphId = buildComposerGraphId(input.eventId, input.composeText.trim());
  const role = inferMarketRole(input.composeText);
  const product = readProductLabel(input.composeText, input.eventId?.trim() || "probe");

  dispatchExecutionFeedGoal({ graphId, goalKo: input.composeText.trim() });

  dispatchExecutionFeedStep({
    graphId,
    stepId: STEP_MARKET,
    labelKo: copy.globe.executionFeed.marketStepQuickList,
    status: "running",
  });

  pushMarketArtifact({
    graphId,
    composeText: input.composeText,
    role,
    activeStep: "review",
    completedThroughStep: "place",
    summaryLineKo: product
      ? copy.globe.executionFeed.marketQuickListSummary(product)
      : null,
    quickList: true,
    primaryActionLabelKo: copy.globe.executionFeed.marketFeedQuickListCta,
  });
}

export function syncMarketQuickListDoneToFeed(input: {
  composeText: string;
  eventId: string;
  productName: string;
  placeLabel: string;
}): void {
  const graphId = buildComposerGraphId(input.eventId, input.composeText.trim());

  dispatchExecutionFeedStep({
    graphId,
    stepId: STEP_MARKET,
    labelKo: copy.globe.executionFeed.marketStepQuickList,
    status: "done",
    resultKo: input.productName.slice(0, 24),
  });

  dispatchExecutionFeedArtifact({
    graphId,
    stepId: STEP_MARKET,
    artifact: {
      kind: "result",
      titleKo: copy.globe.executionFeed.marketStepQuickList,
      summaryLineKo: copy.globe.marketQuickListToast(
        input.productName,
        input.placeLabel,
      ),
      metrics: [
        {
          id: "place",
          labelKo: copy.globe.executionFeed.marketPlaceLabel,
          valueKo: input.placeLabel,
          tone: "positive",
        },
      ],
    },
  });
}
