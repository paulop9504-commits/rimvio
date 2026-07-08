/**
 * Hub factory Commit boundary → HubActionRecord append.
 * Maps Context Action Injection (UI handoff) onto Action Log — not Action Injection itself.
 *
 * @see docs/GLOBE_HUB_RESOURCE.md — 3-Layer Storage Model
 */

import type { ContextActionInjection } from "@/lib/globe/context-action-injection/types";
import {
  createCancelAction,
  createPurchaseAction,
  createReserveAction,
  type HubAction,
} from "@/lib/globe/resource/hub-action-record";
import {
  emitHubActionRecord,
  readHubActionLog,
  type HubActionEmitResult,
} from "@/lib/globe/resource/hub-action-record-store";

function resolveSourceHubId(
  injection: ContextActionInjection,
): string {
  return injection.target.kind === "lodging" ? "hub.lodging" : "hub.eatery";
}

function findLastAction(input: {
  contextEventId: string;
  resourceId: string;
  types: readonly HubAction["type"][];
}): HubAction | null {
  const log = readHubActionLog(input.contextEventId);
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const row = log[i];
    if (!row || row.resourceId !== input.resourceId) {
      continue;
    }
    if (input.types.includes(row.type)) {
      return row;
    }
  }
  return null;
}

function defaultSlot(): { start: string; end: string } {
  const start = new Date();
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

/**
 * After user confirms booking/pay/refund intent — append pending Action Log row.
 */
export function emitHubActionOnInjectionConfirm(
  injection: ContextActionInjection,
): HubActionEmitResult | null {
  const contextEventId = injection.contextEventId?.trim();
  const resourceId = injection.commitHints?.resourceId?.trim();
  if (!contextEventId || !resourceId) {
    return null;
  }

  const sourceHubId = resolveSourceHubId(injection);
  const kind = injection.intent.kind;

  if (kind === "book_lodging" || kind === "book_eatery") {
    return emitHubActionRecord(
      createReserveAction({
        contextEventId,
        resourceId,
        sourceHubId,
        approvalPolicy: "user_tap",
        status: "pending",
        payload: {
          slot: injection.commitHints?.slot ?? defaultSlot(),
          guestCount: injection.commitHints?.guestCount,
        },
      }),
    );
  }

  if (kind === "pay_lodging" || kind === "pay_eatery") {
    return emitHubActionRecord(
      createPurchaseAction({
        contextEventId,
        resourceId,
        sourceHubId,
        approvalPolicy: "user_tap",
        status: "pending",
        payload: {
          amount: injection.commitHints?.amount ?? 0,
          currency: injection.commitHints?.currency ?? "KRW",
        },
      }),
    );
  }

  if (kind === "refund") {
    const target = findLastAction({
      contextEventId,
      resourceId,
      types: ["purchase", "reserve"],
    });
    if (!target) {
      return { ok: false, reason: "refund_no_prior_action" };
    }
    return emitHubActionRecord(
      createCancelAction({
        contextEventId,
        resourceId,
        sourceHubId,
        approvalPolicy: "user_tap",
        status: "pending",
        supersedesActionId: target.actionId,
        payload: { reason: "user_refund" },
      }),
    );
  }

  return null;
}

/**
 * After user opens the injected CTA (external handoff executed) — append success row.
 * Does not mutate the earlier pending row (append-only).
 */
export function emitHubActionOnInjectionExecuted(
  injection: ContextActionInjection,
): HubActionEmitResult | null {
  const contextEventId = injection.contextEventId?.trim();
  const resourceId = injection.commitHints?.resourceId?.trim();
  if (!contextEventId || !resourceId) {
    return null;
  }

  const sourceHubId = resolveSourceHubId(injection);
  const kind = injection.intent.kind;
  const externalRef = injection.injectedAction?.href?.slice(0, 180) || undefined;

  if (kind === "book_lodging" || kind === "book_eatery") {
    const pending = findLastAction({
      contextEventId,
      resourceId,
      types: ["reserve"],
    });
    return emitHubActionRecord(
      createReserveAction({
        contextEventId,
        resourceId,
        sourceHubId,
        approvalPolicy: "user_tap",
        status: "success",
        externalRef,
        supersedesActionId: pending?.status === "pending" ? pending.actionId : undefined,
        payload: {
          slot: injection.commitHints?.slot ?? defaultSlot(),
          guestCount: injection.commitHints?.guestCount,
        },
      }),
    );
  }

  if (kind === "pay_lodging" || kind === "pay_eatery") {
    const pending = findLastAction({
      contextEventId,
      resourceId,
      types: ["purchase"],
    });
    return emitHubActionRecord(
      createPurchaseAction({
        contextEventId,
        resourceId,
        sourceHubId,
        approvalPolicy: "user_tap",
        status: "success",
        externalRef,
        supersedesActionId: pending?.status === "pending" ? pending.actionId : undefined,
        payload: {
          amount: injection.commitHints?.amount ?? 0,
          currency: injection.commitHints?.currency ?? "KRW",
        },
      }),
    );
  }

  if (kind === "refund") {
    const pending = findLastAction({
      contextEventId,
      resourceId,
      types: ["cancel"],
    });
    if (!pending?.supersedesActionId) {
      return { ok: false, reason: "refund_execute_without_pending_cancel" };
    }
    return emitHubActionRecord(
      createCancelAction({
        contextEventId,
        resourceId,
        sourceHubId,
        approvalPolicy: "user_tap",
        status: "success",
        externalRef,
        supersedesActionId: pending.supersedesActionId,
        payload: { reason: "user_refund" },
      }),
    );
  }

  return null;
}
