"use client";

/**
 * Reality Control Center — Commit Gate client.
 * Approves Execution Plans + prepared Operations (place/travel pack) → Reality.
 * Trade rows stay in Field trades FSM (not auto-committed here).
 */

import { commitContextExecutionPlanFromApproval } from "@/lib/context-execution/commit-plan-from-approval";
import { readContextExecutionPlanFromEvent } from "@/lib/context-execution/context-execution-plan-metadata";
import { offerPlanStepHandoffAfterAdvance } from "@/lib/context-execution/offer-plan-step-handoff-client";
import { persistContextExecutionPlanClientAsync } from "@/lib/context-execution/persist-context-execution-plan-client";
import { stampMultiOperatorRole } from "@/lib/engine/team-collab/multi-operator-approval";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { executeBookingOperationsClient } from "@/lib/booking-runtime";
import { resolveBookingProviderForOperation } from "@/lib/booking-runtime/resolve-booking-provider";
import { readIdentityVaultBundleClient } from "@/lib/identity-vault/read-identity-vault-bundle-client";
import { executePaymentPrepAfterCommit } from "@/lib/reality-queue/execute-payment-prep-after-commit";
import type { RealityQueueItemV1 } from "@/lib/reality-queue/types";
import { holdAllRealityQueueItems } from "@/lib/reality-queue/reality-queue-hold-store";
import {
  deletePreparedRealityOperation,
  readPreparedRealityOperation,
} from "@/lib/reality-queue/prepared-operations-store";
import { promotePendingPreparedOpsForCeoSign } from "@/lib/reality-queue/promote-pending-for-ceo-sign";
import { stampCommittedOperationsOnEvent } from "@/lib/reality-queue/stamp-committed-operations";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";

export type CommitRealityQueueResult =
  | {
      ok: true;
      approvedPlanCount: number;
      preparedCommittedCount: number;
      tradeOnly: boolean;
      contextEventIds: readonly string[];
    }
  | {
      ok: false;
      reason: "blocked" | "empty" | "persist_failed" | "booking_failed";
      reasonKo?: string;
    };

function opsNeedIdentity(
  operations: readonly RealityOperationV1[],
): boolean {
  return operations.some(
    (op) => resolveBookingProviderForOperation(op) === "liteapi_booking",
  );
}

function isPreparedOpItem(item: RealityQueueItemV1): boolean {
  return item.operationId.startsWith("op:");
}

export async function commitRealityQueueClient(input: {
  items: readonly RealityQueueItemV1[];
  canCommit: boolean;
  /** One-tap CEO Sign: promote pending → ready before Commit. */
  promotePendingOnSign?: boolean;
}): Promise<CommitRealityQueueResult> {
  if (input.items.length === 0) {
    return { ok: false, reason: "empty" };
  }

  let workingItems = input.items;
  let canCommit = input.canCommit;
  if (input.promotePendingOnSign === true) {
    const promoted = promotePendingPreparedOpsForCeoSign(input.items);
    if (promoted > 0) {
      workingItems = input.items.map((item) =>
        item.status === "pending" &&
        item.operationId.startsWith("op:") &&
        item.kind !== "trade"
          ? { ...item, status: "ready" as const }
          : item,
      );
      canCommit =
        workingItems.some((item) => item.status === "ready") &&
        !workingItems.some(
          (item) =>
            item.status === "needs_review" || item.status === "running",
        );
    }
  }

  if (!canCommit) {
    return { ok: false, reason: "blocked" };
  }

  const planEventIds = [
    ...new Set(
      workingItems
        .filter((item) => item.kind === "execution_step" && item.contextEventId)
        .map((item) => item.contextEventId!.trim()),
    ),
  ];

  const preparedReady = workingItems.filter(
    (item) =>
      isPreparedOpItem(item) &&
      item.status === "ready" &&
      item.kind !== "trade",
  );

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

  // Prepared Operations (place / travel pack) → durable stamp + drop from Inbox
  const byContext = new Map<string, RealityOperationV1[]>();
  for (const item of preparedReady) {
    const prepared = readPreparedRealityOperation(item.operationId);
    if (!prepared || prepared.status !== "ready") {
      continue;
    }
    const ctx = prepared.contextEventId?.trim();
    if (!ctx) {
      continue;
    }
    const list = byContext.get(ctx) ?? [];
    list.push(prepared);
    byContext.set(ctx, list);
  }

  let preparedCommittedCount = 0;
  const preparedContextIds: string[] = [];
  for (const [eventId, ops] of byContext) {
    const event = findLifeEventCandidate(eventId);
    if (!event) {
      continue;
    }

    const paymentOps = ops.filter((op) => op.type === "payment_prep");
    const bookingOps = ops.filter((op) => op.type !== "payment_prep");

    if (paymentOps.length > 0) {
      const payment = await executePaymentPrepAfterCommit({
        operations: paymentOps,
      });
      if (!payment.ok) {
        return {
          ok: false,
          reason: "booking_failed",
          reasonKo: payment.reasonKo,
        };
      }
      stampCommittedOperationsOnEvent({ event, operations: paymentOps });
      for (const op of paymentOps) {
        deletePreparedRealityOperation(op.operationId);
        preparedCommittedCount += 1;
      }
      preparedContextIds.push(eventId);
    }

    if (bookingOps.length === 0) {
      continue;
    }

    const identityBundle = opsNeedIdentity(bookingOps)
      ? await readIdentityVaultBundleClient()
      : null;
    const booking = await executeBookingOperationsClient({
      contextEventId: eventId,
      operations: bookingOps,
      approvedByHuman: true,
      identityBundle,
    });
    if (!booking.ok) {
      return {
        ok: false,
        reason: "booking_failed",
        reasonKo: booking.reasonKo,
      };
    }
    for (const receipt of booking.receipts) {
      if (receipt.status === "handoff" && receipt.handoffUrl) {
        window.open(receipt.handoffUrl, "_blank", "noopener,noreferrer");
      }
    }
    stampCommittedOperationsOnEvent({ event, operations: bookingOps });
    for (const op of bookingOps) {
      deletePreparedRealityOperation(op.operationId);
      preparedCommittedCount += 1;
    }
    preparedContextIds.push(eventId);
  }

  const contextEventIds = [
    ...new Set([...planEventIds, ...preparedContextIds]),
  ];

  const tradeOnly =
    approvedPlanCount === 0 &&
    preparedCommittedCount === 0 &&
    workingItems.every((item) => item.kind === "trade");

  return {
    ok: true,
    approvedPlanCount: approvedPlanCount + preparedCommittedCount,
    preparedCommittedCount,
    tradeOnly,
    contextEventIds,
  };
}

export function rejectRealityQueueClient(input: {
  items: readonly RealityQueueItemV1[];
}): void {
  holdAllRealityQueueItems(input.items.map((item) => item.itemId));
}
