/**
 * In-app Hub checkout — reserve + PG + purchase with identity refs only.
 * @see docs/GLOBE_HUB_RESOURCE.md — Transaction phased: handoff → in-app E2E
 */

import { runHubPgCheckoutClient } from "@/lib/globe/hub-checkout/pg/run-hub-pg-checkout-client";
import { resolveLiteApiPaymentTargetSelector } from "@/lib/globe/hub-checkout/liteapi/resolve-liteapi-payment-target";
import { runLiteApiCheckoutClient } from "@/lib/globe/hub-checkout/liteapi/run-liteapi-checkout-client";
import type { HubPgPendingFinalize } from "@/lib/globe/hub-checkout/pg/types";
import {
  createPurchaseActionWithIdentity,
  createReserveActionWithIdentity,
} from "@/lib/globe/resource/emit-hub-action-with-identity";
import { emitHubActionRecord } from "@/lib/globe/resource/hub-action-record-store";
import type {
  ExecuteLodgingHubCheckoutResult,
  HubCheckoutPaymentMethod,
  HubLodgingCheckoutSession,
} from "@/lib/globe/hub-checkout/types";
import type { IdentityVaultBundle } from "@/lib/identity-vault/types";

/** After Toss/Kakao redirect — finalize purchase from pending sessionStorage row. */
export async function finalizeLodgingHubCheckoutFromPgReturn(input: {
  pending: HubPgPendingFinalize;
  identityBundle: IdentityVaultBundle;
  externalRef: string;
  handoffHref: string;
}): Promise<ExecuteLodgingHubCheckoutResult> {
  const purchaseBuilt = createPurchaseActionWithIdentity({
    hubId: "lodging",
    identityBundle: input.identityBundle,
    contextEventId: input.pending.contextEventId,
    resourceId: input.pending.resourceId,
    sourceHubId: "lodging",
    approvalPolicy: "user_tap",
    status: "success",
    externalRef: input.externalRef,
    payload: {
      amount: input.pending.amountKrw,
      currency: "KRW",
    },
  });

  const purchaseEmit = emitHubActionRecord(purchaseBuilt.action);
  if (!purchaseEmit.ok) {
    return { ok: false, reason: "emit_failed", emitReason: purchaseEmit.reason };
  }

  const booking = createReserveActionWithIdentity({
    hubId: "lodging",
    identityBundle: input.identityBundle,
    contextEventId: input.pending.contextEventId,
    resourceId: input.pending.resourceId,
    sourceHubId: "lodging",
    approvalPolicy: "user_tap",
    payload: {
      slot: { start: "", end: "" },
      guestCount: 1,
    },
  }).booking;

  return {
    ok: true,
    reserveActionId: "",
    purchaseActionId: purchaseBuilt.action.actionId,
    externalRef: input.externalRef,
    handoffHref: input.handoffHref,
    maskedIdentityKo: booking.maskedLabelKo,
    purchaseDeferred: false,
  };
}

/** After LiteAPI Payment SDK redirect — book + purchase action log. */
export async function finalizeLodgingHubCheckoutFromLiteApiReturn(input: {
  contextEventId: string;
  resourceId: string;
  identityBundle: IdentityVaultBundle;
  prebookId: string;
  transactionId: string;
  bookingId: string;
  hotelConfirmationCode: string | null;
}): Promise<ExecuteLodgingHubCheckoutResult> {
  const reserveBuilt = createReserveActionWithIdentity({
    hubId: "lodging",
    identityBundle: input.identityBundle,
    contextEventId: input.contextEventId,
    resourceId: input.resourceId,
    sourceHubId: "lodging",
    approvalPolicy: "user_tap",
    status: "success",
    payload: {
      slot: { start: "", end: "" },
      guestCount: 1,
    },
  });

  const reserveEmit = emitHubActionRecord(reserveBuilt.action);
  if (!reserveEmit.ok) {
    return { ok: false, reason: "emit_failed", emitReason: reserveEmit.reason };
  }

  const externalRef = `liteapi:${input.bookingId}`;
  const purchaseBuilt = createPurchaseActionWithIdentity({
    hubId: "lodging",
    identityBundle: input.identityBundle,
    contextEventId: input.contextEventId,
    resourceId: input.resourceId,
    sourceHubId: "lodging",
    approvalPolicy: "user_tap",
    status: "success",
    externalRef,
    payload: {
      amount: 0,
      currency: "KRW",
      confirmationCode: input.hotelConfirmationCode,
      prebookId: input.prebookId,
      transactionId: input.transactionId,
    },
  });

  const purchaseEmit = emitHubActionRecord(purchaseBuilt.action);
  if (!purchaseEmit.ok) {
    return { ok: false, reason: "emit_failed", emitReason: purchaseEmit.reason };
  }

  return {
    ok: true,
    reserveActionId: reserveBuilt.action.actionId,
    purchaseActionId: purchaseBuilt.action.actionId,
    externalRef,
    handoffHref: "",
    maskedIdentityKo: reserveBuilt.booking.maskedLabelKo,
    purchaseDeferred: false,
  };
}

export async function executeLodgingHubCheckout(input: {
  session: HubLodgingCheckoutSession;
  identityBundle: IdentityVaultBundle;
  paymentMethod: HubCheckoutPaymentMethod;
  paymentTargetSelector?: string;
}): Promise<ExecuteLodgingHubCheckoutResult> {
  const { session, identityBundle, paymentMethod } = input;
  if (!session.amountKrw || session.amountKrw <= 0) {
    return { ok: false, reason: "invalid_amount" };
  }

  if (session.checkoutProvider === "liteapi") {
    const lite = await runLiteApiCheckoutClient({
      session,
      identityBundle,
      paymentTargetSelector:
        input.paymentTargetSelector ??
        resolveLiteApiPaymentTargetSelector(session.sessionId),
    });
    if (!lite.ok) {
      return {
        ok: false,
        reason: lite.reason === "missing_identity" ? "missing_identity" : "pg_failed",
        pgMessage:
          lite.reason === "prebook_failed"
            ? "객실 가격을 다시 확인할 수 없어요"
            : undefined,
      };
    }
    return {
      ok: true,
      reserveActionId: "",
      purchaseActionId: "",
      externalRef: `liteapi:pending:${session.sessionId}`,
      handoffHref: session.handoffHref,
      maskedIdentityKo: "",
      purchaseDeferred: true,
    };
  }

  const reserveBuilt = createReserveActionWithIdentity({
    hubId: "lodging",
    identityBundle,
    contextEventId: session.contextEventId,
    resourceId: session.resourceId,
    sourceHubId: "lodging",
    approvalPolicy: "user_tap",
    status: "success",
    payload: {
      slot: {
        start: session.checkInIso.slice(0, 10),
        end: session.checkOutIso.slice(0, 10),
      },
      guestCount: session.offer.guestCount,
    },
  });

  if (!reserveBuilt.booking.complete) {
    return {
      ok: false,
      reason: "missing_identity",
      missingSlots: reserveBuilt.booking.missingSlots,
    };
  }

  const reserveEmit = emitHubActionRecord(reserveBuilt.action);
  if (!reserveEmit.ok) {
    return { ok: false, reason: "emit_failed", emitReason: reserveEmit.reason };
  }

  const pg = await runHubPgCheckoutClient({ session, paymentMethod });
  if (!pg.ok) {
    return {
      ok: false,
      reason: "pg_failed",
      pgReason: pg.reason,
      pgMessage: pg.message,
    };
  }

  if (pg.provider === "toss_widget" || pg.provider === "kakao_ready") {
    return {
      ok: true,
      reserveActionId: reserveBuilt.action.actionId,
      purchaseActionId: "",
      externalRef: pg.externalRef,
      handoffHref: session.handoffHref,
      maskedIdentityKo: reserveBuilt.booking.maskedLabelKo,
      purchaseDeferred: true,
    };
  }

  const purchaseBuilt = createPurchaseActionWithIdentity({
    hubId: "lodging",
    identityBundle,
    contextEventId: session.contextEventId,
    resourceId: session.resourceId,
    sourceHubId: "lodging",
    approvalPolicy: "user_tap",
    status: "success",
    externalRef: pg.externalRef,
    payload: {
      amount: session.amountKrw,
      currency: session.currency,
    },
  });

  const purchaseEmit = emitHubActionRecord(purchaseBuilt.action);
  if (!purchaseEmit.ok) {
    return { ok: false, reason: "emit_failed", emitReason: purchaseEmit.reason };
  }

  return {
    ok: true,
    reserveActionId: reserveBuilt.action.actionId,
    purchaseActionId: purchaseBuilt.action.actionId,
    externalRef: pg.externalRef,
    handoffHref: session.handoffHref,
    maskedIdentityKo: reserveBuilt.booking.maskedLabelKo,
    purchaseDeferred: false,
  };
}
