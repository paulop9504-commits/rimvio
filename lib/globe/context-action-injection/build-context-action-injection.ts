import { copy } from "@/lib/copy/human-ko";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  buildContextEateryBookingHandoff,
  buildContextLodgingBookingHandoff,
  formatContextActionTargetPriceLine,
} from "@/lib/globe/context-action-injection/build-context-action-handoff";
import type {
  ContextActionInjection,
  ContextActionIntent,
} from "@/lib/globe/context-action-injection/types";
import { readContextConditionPinnedPlaceIds } from "@/lib/globe/context-condition-ai/pin-context-condition-recommendation";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";

function confirmPromptKo(intent: ContextActionIntent, title: string): string {
  switch (intent.kind) {
    case "book_lodging":
      return copy.globe.contextActionConfirmBookLodging(title);
    case "pay_lodging":
      return copy.globe.contextActionConfirmPayLodging(title);
    case "book_eatery":
      return copy.globe.contextActionConfirmBookEatery(title);
    case "pay_eatery":
      return copy.globe.contextActionConfirmPayEatery(title);
    case "refund":
      return copy.globe.contextActionConfirmRefund(title);
    default:
      return copy.globe.contextActionConfirmDefault(title);
  }
}

/** Pinned target + intent → confirmation surface (action not injected until accept). */
export function buildContextActionInjection(input: {
  event: EventCandidate;
  intent: ContextActionIntent;
}): ContextActionInjection | null {
  const pinned = readContextConditionPinnedPlaceIds(input.event);
  const placeId =
    input.intent.resourceKind === "lodging"
      ? pinned.lodging
      : pinned.eatery;
  if (!placeId) {
    return null;
  }

  if (input.intent.kind === "refund") {
    return {
      id: `ctxact-${Date.now()}`,
      phase: "awaiting_confirm",
      intent: input.intent,
      target: {
        kind: input.intent.resourceKind,
        placeId,
        title: copy.globe.contextActionRefundTargetFallback,
        priceLineKo: null,
        addressKo: null,
      },
      confirmPromptKo: copy.globe.contextActionConfirmRefund(
        copy.globe.contextActionRefundTargetFallback,
      ),
      confirmAcceptLabelKo: copy.globe.contextActionConfirmYes,
      confirmRejectLabelKo: copy.globe.contextActionConfirmNo,
      injectedAction: null,
    };
  }

  if (input.intent.resourceKind === "lodging") {
    const row = readLodgingInventoryRows(input.event).find(
      (entry) => entry.placeId === placeId,
    );
    if (!row) {
      return null;
    }
    const title = row.name?.trim() || placeId;
    return {
      id: `ctxact-${Date.now()}`,
      phase: "awaiting_confirm",
      intent: input.intent,
      target: {
        kind: "lodging",
        placeId,
        title,
        priceLineKo: formatContextActionTargetPriceLine({
          kind: "lodging",
          priceKrw: row.priceKrw,
        }),
        addressKo: row.address?.trim() || null,
      },
      confirmPromptKo: confirmPromptKo(input.intent, title),
      confirmAcceptLabelKo: copy.globe.contextActionConfirmYes,
      confirmRejectLabelKo: copy.globe.contextActionConfirmNo,
      injectedAction: buildContextLodgingBookingHandoff({
        row,
        event: input.event,
        intent: input.intent,
      }),
    };
  }

  const row = readEateryInventoryRows(input.event).find(
    (entry) => entry.placeId === placeId,
  );
  if (!row) {
    return null;
  }
  const title = row.name?.trim() || placeId;
  return {
    id: `ctxact-${Date.now()}`,
    phase: "awaiting_confirm",
    intent: input.intent,
    target: {
      kind: "eatery",
      placeId,
      title,
      priceLineKo: null,
      addressKo: row.address?.trim() || null,
    },
    confirmPromptKo: confirmPromptKo(input.intent, title),
    confirmAcceptLabelKo: copy.globe.contextActionConfirmYes,
    confirmRejectLabelKo: copy.globe.contextActionConfirmNo,
    injectedAction: buildContextEateryBookingHandoff({
      row,
      intent: input.intent,
    }),
  };
}

export function confirmContextActionInjection(
  injection: ContextActionInjection,
): ContextActionInjection {
  if (injection.intent.kind === "refund") {
    return {
      ...injection,
      phase: "injected",
      injectedAction: {
        actionTypeId: "field.refund_request",
        labelKo: copy.globe.contextActionInjectRefund,
        href: "rimvio://field/support",
        internalRoute: true,
      },
    };
  }
  return {
    ...injection,
    phase: "injected",
    injectedAction: injection.injectedAction,
  };
}

export function dismissContextActionInjection(
  injection: ContextActionInjection,
): ContextActionInjection {
  return { ...injection, phase: "dismissed", injectedAction: null };
}

export function markContextActionInjectionExecuted(
  injection: ContextActionInjection,
): ContextActionInjection {
  return { ...injection, phase: "executed" };
}
