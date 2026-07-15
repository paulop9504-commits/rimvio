"use client";

/**
 * After scout_complete — quality gate → merge feed → replan or Field human decision.
 * Never Commits Reality.
 */

import { appendContextAgentComposeTurn } from "@/lib/globe/assistant";
import { recordPlanSequencerProgress } from "@/lib/context-execution/record-plan-sequencer-progress";
import { recordEngineLifecycleClient } from "@/lib/engine/record-engine-lifecycle";
import {
  queueEngineFieldHandoffForHumanDecision,
} from "@/lib/engine/team-collab/field-handoff-queue";
import { openPendingFieldHandoffClient } from "@/lib/engine/team-collab/open-field-handoff-client";
import { queueEngineTeamPassAfterTouch } from "@/lib/engine/team-collab/engine-pass-queue";
import { appendEngineEventToMetadata } from "@/lib/engine/engine-event-metadata";
import type { RimvioEngineId } from "@/lib/engine/engine-types";
import type { ContextConditionAnchorPinOutcome } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { evaluateScoutQualityGate } from "@/lib/globe/discovery-quality/evaluate-scout-quality-gate";
import { mergeDiscoveryRetryIntoActiveFeed } from "@/lib/globe/discovery-quality/merge-discovery-retry-batch";
import { resolveQualityReplanFormation } from "@/lib/globe/discovery-quality/resolve-quality-replan-formation";
import { publishScoutNarrationLiveStep } from "@/lib/globe/narrator-engine";
import {
  bumpScoutQualityAttempt,
  CONTEXT_SCOUT_QUALITY_BUDGET_META_KEY,
  readScoutQualityAttemptsUsed,
} from "@/lib/globe/discovery-quality/scout-quality-budget";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { requestOperatorAutoRun } from "@/lib/globe/operator-turn/operator-auto-run-bridge";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export type ScoutQualityCoachResult = {
  readonly verdict: "sufficient" | "insufficient" | "exhausted";
  readonly mergedTotal: number;
  readonly replanned: boolean;
  readonly fieldOpened: boolean;
};

function countByKind(
  outcome: ContextConditionAnchorPinOutcome,
  kind: "lodging" | "eatery" | "activity" | "amenity",
): number {
  return outcome.recommendations.filter((row) => row.kind === kind).length;
}

function persistBudgetMetadata(
  contextEventId: string,
  budgetMetadata: Record<string, unknown>,
): Record<string, unknown> {
  const event = findLifeEventCandidate(contextEventId);
  const budgetWire = budgetMetadata[CONTEXT_SCOUT_QUALITY_BUDGET_META_KEY];
  if (!event || budgetWire == null) {
    return event?.metadata ?? budgetMetadata;
  }
  const metadata = {
    ...(event.metadata ?? {}),
    [CONTEXT_SCOUT_QUALITY_BUDGET_META_KEY]: budgetWire,
  };
  commitEventUpsert({
    ...event,
    metadata,
    updatedAt: new Date().toISOString(),
  });
  return metadata;
}

/**
 * Call from handlePinned after a scout outcome is on the active feed.
 * Records lifecycle + coach path (merge · pass · Field).
 */
export function runScoutQualityCoachAfterScout(input: {
  contextEventId: string;
  engineId: RimvioEngineId;
  outcome: ContextConditionAnchorPinOutcome;
  triggerMessage?: string | null;
}): ScoutQualityCoachResult {
  const contextEventId = input.contextEventId.trim();
  const event = findLifeEventCandidate(contextEventId);
  let metadata = event?.metadata ?? {};

  const attemptsBefore = readScoutQualityAttemptsUsed(metadata, input.engineId);
  const gate = evaluateScoutQualityGate({
    recommendationCount: input.outcome.recommendations.length,
    lodgingCount: input.outcome.lodgingCount,
    eateryCount: input.outcome.eateryCount,
    activityCount: countByKind(input.outcome, "activity"),
    amenityCount: countByKind(input.outcome, "amenity"),
    attemptsUsed: attemptsBefore,
  });

  const merge = mergeDiscoveryRetryIntoActiveFeed({
    contextEventId,
    incoming: {
      batchId: input.outcome.batchId,
      summaryKo: input.outcome.summaryKo,
      radiusM: input.outcome.radiusM,
      triggerMessage: input.triggerMessage ?? undefined,
      recommendations: input.outcome.recommendations,
      spec: input.outcome.spec,
    },
  });

  metadata = bumpScoutQualityAttempt({
    metadata,
    engineId: input.engineId,
    verdict: gate.verdict,
  });
  metadata = persistBudgetMetadata(contextEventId, metadata);
  const attemptsAfter = readScoutQualityAttemptsUsed(metadata, input.engineId);

  if (gate.verdict === "sufficient") {
    recordEngineLifecycleClient({
      contextEventId,
      engineId: input.engineId,
      kind: "scout_complete",
      payload: {
        batchId: input.outcome.batchId,
        recommendationCount: merge.totalCount,
        quality: "sufficient",
        addedCount: merge.addedCount,
      },
    });
    return {
      verdict: "sufficient",
      mergedTotal: merge.totalCount,
      replanned: false,
      fieldOpened: false,
    };
  }

  recordEngineLifecycleClient({
    contextEventId,
    engineId: input.engineId,
    kind: "scout_insufficient",
    payload: {
      batchId: input.outcome.batchId,
      recommendationCount: merge.totalCount,
      quality: gate.verdict,
      reason: gate.reason,
      minExpected: gate.minExpected,
      addedCount: merge.addedCount,
    },
  });

  let working = findLifeEventCandidate(contextEventId);
  metadata = {
    ...(working?.metadata ?? {}),
    [CONTEXT_SCOUT_QUALITY_BUDGET_META_KEY]:
      metadata[CONTEXT_SCOUT_QUALITY_BUDGET_META_KEY],
  };

  if (gate.verdict === "exhausted") {
    const fieldQueued = queueEngineFieldHandoffForHumanDecision({
      metadata,
      fromEngineId: input.engineId,
    });
    metadata = fieldQueued.metadata;
    metadata = appendEngineEventToMetadata({
      metadata,
      engineId: input.engineId,
      kind: "field_ready",
      payload: {
        tab: fieldQueued.pending.tab,
        hintKo: fieldQueued.pending.hintKo,
        reason: "scout_quality_exhausted",
      },
    });
    if (working) {
      commitEventUpsert({
        ...working,
        metadata,
        updatedAt: new Date().toISOString(),
      });
    }
    appendContextAgentComposeTurn(contextEventId, {
      role: "assistant",
      kind: "text",
      text: "후보가 충분하지 않아요 — 맞춤에서 직접 골라 주세요.",
    });
    recordPlanSequencerProgress({
      contextEventId,
      engineId: input.engineId,
      phase: "blocked_retry",
      detailKo: "품질 예산 소진 — Field 사람 결정",
    });
    const fieldOpened = openPendingFieldHandoffClient(contextEventId);
    return {
      verdict: "exhausted",
      mergedTotal: merge.totalCount,
      replanned: false,
      fieldOpened,
    };
  }

  const replan = resolveQualityReplanFormation({
    fromEngineId: input.engineId,
    contextEventId,
    attemptsUsedAfterBump: attemptsAfter,
    seedUtterance: input.triggerMessage,
  });

  const passQueued = queueEngineTeamPassAfterTouch({
    metadata,
    fromEngineId: input.engineId,
    toEngineId: replan.toEngineId,
    reason: "pass",
  });
  metadata = passQueued.metadata;
  if (passQueued.pending) {
    metadata = appendEngineEventToMetadata({
      metadata,
      engineId: input.engineId,
      kind: "pass",
      payload: {
        toEngineId: passQueued.pending.toEngineId,
        seedUtterance: replan.seedUtterance,
        reason: "quality_replan",
        mode: replan.mode,
      },
    });
  } else if (replan.toEngineId === input.engineId) {
    // Same-engine widen — still emit pass-shaped seed for soft continue.
    metadata = appendEngineEventToMetadata({
      metadata,
      engineId: input.engineId,
      kind: "pass",
      payload: {
        toEngineId: input.engineId,
        seedUtterance: replan.seedUtterance,
        reason: "quality_replan",
        mode: replan.mode,
      },
    });
  }

  working = findLifeEventCandidate(contextEventId);
  if (working) {
    commitEventUpsert({
      ...working,
      metadata,
      updatedAt: new Date().toISOString(),
    });
  }

  const streamed = publishScoutNarrationLiveStep({
    contextEventId,
    textKo: `🔄 ${replan.hintKo}`,
    stepId: `quality_replan_${Date.now().toString(36)}`,
  });
  if (!streamed) {
    appendContextAgentComposeTurn(contextEventId, {
      role: "assistant",
      kind: "text",
      text: replan.hintKo,
    });
  }
  recordPlanSequencerProgress({
    contextEventId,
    engineId: replan.toEngineId,
    phase: "scout_retry",
    detailKo: replan.hintKo,
  });
  requestOperatorAutoRun({
    contextEventId,
    text: replan.seedUtterance,
    source: "scout_retry",
    progressKo: replan.hintKo,
  });

  return {
    verdict: "insufficient",
    mergedTotal: merge.totalCount,
    replanned: true,
    fieldOpened: false,
  };
}
