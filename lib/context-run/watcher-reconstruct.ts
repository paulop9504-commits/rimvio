import {
  dispatchExecutionFeedGoal,
  readExecutionFeedState,
} from "@/lib/context-run/execution-feed-bridge";
import { readActiveRunState } from "@/lib/context-run/run-state-store";
import {
  syncMarketWizardStepToFeed,
} from "@/lib/context-run/sync-market-compose-to-feed";
import {
  isBareMarketComposeInput,
  isMarketComposeInput,
  readMarketComposeQuery,
} from "@/lib/globe/market/detect-market-compose-input";
import { marketWizardDefaultActiveStep } from "@/lib/context-run/build-market-wizard-checklist";
import type { MarketWizardStepId } from "@/lib/globe/market/market-intent-wizard-flow";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import { normalizeMarketIntentFromText } from "@/lib/globe/market/normalize-market-intent-from-text";

const MARKET_NODE_PREFIX = "market_compose:";

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

function parseMarketWizardStep(
  lastVisitedNode: string | null | undefined,
): MarketWizardStepId | null {
  if (!lastVisitedNode?.startsWith(MARKET_NODE_PREFIX)) {
    return null;
  }
  const step = lastVisitedNode.slice(MARKET_NODE_PREFIX.length).trim();
  const allowed: MarketWizardStepId[] = [
    "role",
    "recognize",
    "priority",
    "photos",
    "memory",
    "description",
    "place",
    "review",
  ];
  return allowed.includes(step as MarketWizardStepId)
    ? (step as MarketWizardStepId)
    : null;
}

/**
 * Watcher — rebuild Execution Feed projection from durable RunState + goal (G8).
 * Does not replay chat; regenerates pills/artifact from minimal run pointer.
 */
export function reconstructExecutionFeedFromRunState(): boolean {
  const runState = readActiveRunState();
  if (!runState || runState.status === "cancelled") {
    return false;
  }

  const feed = readExecutionFeedState();
  if (feed.run?.graphId === runState.graphId && feed.run.artifact) {
    return true;
  }

  const goal = runState.goal.trim();
  if (!goal) {
    return false;
  }

  if (isBareMarketComposeInput(goal) || isMarketComposeInput(goal)) {
    const role = inferMarketRole(goal);
    const resumedStep =
      parseMarketWizardStep(runState.lastVisitedNode) ??
      marketWizardDefaultActiveStep(role, { skipRole: true });
    syncMarketWizardStepToFeed({
      composeText: goal,
      eventId: null,
      role,
      activeStep: resumedStep,
      portalLaunch: true,
    });
    return true;
  }

  if (!feed.run || feed.run.graphId !== runState.graphId) {
    dispatchExecutionFeedGoal({ graphId: runState.graphId, goalKo: goal });
  }
  return true;
}

/** Client watcher — reconstruct on mount and when tab becomes visible again. */
export function subscribeContextRunWatcher(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  reconstructExecutionFeedFromRunState();

  const onVisible = () => {
    if (document.visibilityState === "visible") {
      reconstructExecutionFeedFromRunState();
    }
  };

  document.addEventListener("visibilitychange", onVisible);
  return () => document.removeEventListener("visibilitychange", onVisible);
}

/** RunState node id for market wizard steps — used by Watcher reconstruct. */
export function marketComposeRunNode(step: MarketWizardStepId): string {
  return `${MARKET_NODE_PREFIX}${step}`;
}
