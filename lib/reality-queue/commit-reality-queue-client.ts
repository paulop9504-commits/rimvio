"use client";

/**
 * Reality Control Center — Commit Gate client.
 * Approves Execution Plans (plan gate + L5) and persists to Event SSOT.
 * Trade rows stay in Field trades FSM (not auto-committed here).
 */

import { commitContextExecutionPlanFromApproval } from "@/lib/context-execution/commit-plan-from-approval";
import { readContextExecutionPlanFromEvent } from "@/lib/context-execution/context-execution-plan-metadata";
import { offerPlanStepHandoffAfterAdvance } from "@/lib/context-execution/offer-plan-step-handoff-client";
import { persistContextExecutionPlanClientAsync } from "@/lib/context-execution/persist-context-execution-plan-client";
import { stampMultiOperatorRole } from "@/lib/engine/team-collab/multi-operator-approval";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import type { RealityQueueItemV1 } from "@/lib/reality-queue/types";
import { holdAllRealityQueueItems } from "@/lib/reality-queue/reality-queue-hold-store";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export type CommitRealityQueueResult =
  | {
      ok: true;
      approvedPlanCount: number;
      tradeOnly: boolean;
      contextEventIds: readonly string[];
    }
  | { ok: false; reason: "blocked" | "empty" | "persist_failed" };

export async function commitRealityQueueClient(input: {
  items: readonly RealityQueueItemV1[];
  canCommit: boolean;
}): Promise<CommitRealityQueueResult> {
  if (input.items.length === 0) {
    return { ok: false, reason: "empty" };
  }
  if (!input.canCommit) {
    return { ok: false, reason: "blocked" };
  }

  const planEventIds = [
    ...new Set(
      input.items
        .filter((item) => item.kind === "execution_step" && item.contextEventId)
        .map((item) => item.contextEventId!.trim()),
    ),
  ];

  if (planEventIds.length === 0) {
    return {
      ok: true,
      approvedPlanCount: 0,
      tradeOnly: true,
      contextEventIds: [],
    };
  }

  let approvedPlanCount = 0;
  for (const eventId of planEventIds) {
    const event = findLifeEventCandidate(eventId);
    if (!event) {
      continue;
    }
    const plan = readContextExecutionPlanFromEvent(event);
    if (!plan) {
      continue;
    }
    const next = commitContextExecutionPlanFromApproval({ plan });
    if (
      next.osPhase === plan.osPhase &&
      next.approval === plan.approval &&
      next.updatedAtIso === plan.updatedAtIso
    ) {
      continue;
    }
    const persisted = await persistContextExecutionPlanClientAsync({
      contextEventId: eventId,
      plan: next,
    });
    if (!persisted.ok) {
      return { ok: false, reason: "persist_failed" };
    }
    const stampedEvent = findLifeEventCandidate(eventId);
    if (stampedEvent?.metadata) {
      commitEventUpsert({
        ...stampedEvent,
        metadata: stampMultiOperatorRole({
          metadata: stampedEvent.metadata,
          role: "human",
        }),
        updatedAt: new Date().toISOString(),
      });
    }
    offerPlanStepHandoffAfterAdvance({
      contextEventId: eventId,
      plan: next,
    });
    approvedPlanCount += 1;
  }

  return {
    ok: true,
    approvedPlanCount,
    tradeOnly: false,
    contextEventIds: planEventIds,
  };
}

export function rejectRealityQueueClient(input: {
  items: readonly RealityQueueItemV1[];
}): void {
  holdAllRealityQueueItems(input.items.map((item) => item.itemId));
}
