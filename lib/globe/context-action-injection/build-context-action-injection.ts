import { copy } from "@/lib/copy/human-ko";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  buildContextEateryBookingHandoff,
  buildContextLodgingBookingHandoff,
  buildContextLodgingHubCheckoutHandoff,
  formatContextActionTargetPriceLine,
} from "@/lib/globe/context-action-injection/build-context-action-handoff";
import type {
  ContextActionCommitHints,
  ContextActionInjection,
  ContextActionIntent,
} from "@/lib/globe/context-action-injection/types";
import { readContextConditionPinnedPlaceIds } from "@/lib/globe/context-condition-ai/pin-context-condition-recommendation";
import { buildLodgingStayWindow } from "@/lib/globe/context-hub/lodging-stay-window";
import { readLodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { resolveLodgingRoomCardStep } from "@/lib/globe/hub-checkout/resolve-lodging-hub-checkout-session";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import {
  emitHubActionOnInjectionConfirm,
  emitHubActionOnInjectionExecuted,
} from "@/lib/globe/resource/emit-hub-action-from-commit";

function ymd(iso: string | null | undefined): string | null {
  if (!iso?.trim()) {
    return null;
  }
  const date = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function lodgingCommitHints(input: {
  event: EventCandidate;
  placeId: string;
  row: {
    placeId: string;
    priceKrw?: number | null;
    checkInIso?: string | null;
    checkOutIso?: string | null;
  };
}): ContextActionCommitHints {
  const stay = buildLodgingStayWindow({ event: input.event, row: input.row });
  const start =
    ymd(input.row.checkInIso) ?? ymd(stay?.checkInIso) ?? undefined;
  const end =
    ymd(input.row.checkOutIso) ?? ymd(stay?.checkOutIso) ?? undefined;
  return {
    resourceId: `${input.event.id}:lodging:${input.placeId}`,
    slot: start && end ? { start, end } : undefined,
    amount:
      typeof input.row.priceKrw === "number" && Number.isFinite(input.row.priceKrw)
        ? input.row.priceKrw
        : undefined,
    currency: "KRW",
  };
}

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
      contextEventId: input.event.id,
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
      commitHints: {
        resourceId: `${input.event.id}:${input.intent.resourceKind}:${placeId}`,
      },
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
    const roomStep = resolveLodgingRoomCardStep(input.event, placeId);
    const useHubCheckout =
      roomStep != null &&
      (input.intent.kind === "book_lodging" || input.intent.kind === "pay_lodging");
    return {
      id: `ctxact-${Date.now()}`,
      contextEventId: input.event.id,
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
      injectedAction: useHubCheckout
        ? buildContextLodgingHubCheckoutHandoff({ intent: input.intent })
        : buildContextLodgingBookingHandoff({
            row,
            event: input.event,
            intent: input.intent,
            contextEventId: input.event.id,
            guestCount: readLodgingBookingSlots(input.event).guestCount ?? 1,
          }),
      commitHints: lodgingCommitHints({
        event: input.event,
        placeId,
        row,
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
    contextEventId: input.event.id,
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
    commitHints: {
      resourceId: `${input.event.id}:eatery:${placeId}`,
      currency: "KRW",
    },
  };
}

export function confirmContextActionInjection(
  injection: ContextActionInjection,
): ContextActionInjection {
  // Action Log: pending reserve / purchase / cancel (≠ UI injection CTA).
  void emitHubActionOnInjectionConfirm(injection);

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
  // Action Log: success row after external handoff open (append-only).
  void emitHubActionOnInjectionExecuted(injection);
  return { ...injection, phase: "executed" };
}
