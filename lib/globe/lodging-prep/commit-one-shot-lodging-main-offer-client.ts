"use client";

import { appendLodgingRoomCardsComposeTurn } from "@/lib/globe/assistant";
import type { ContextConditionAnchorPinOutcome } from "@/lib/globe/context-condition-ai";
import { pinContextConditionRecommendation } from "@/lib/globe/context-condition-ai/pin-context-condition-recommendation";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { resolveLodgingRoomCardStep } from "@/lib/globe/hub-checkout/resolve-lodging-hub-checkout-session";
import { planOneShotLodgingPrep } from "@/lib/globe/lodging-prep/plan-one-shot-lodging-prep";
import { resolveLodgingPrepMainRecommendation } from "@/lib/globe/lodging-prep/resolve-lodging-prep-main-recommendation";
import {
  openExpressCheckoutFromPreparedSession,
  type RunOneShotLodgingPrepResult,
} from "@/lib/globe/lodging-prep/run-one-shot-lodging-prep-client";
import { prepareLodgingHubCheckout } from "@/lib/globe/hub-checkout/prepare-lodging-hub-checkout";

export type CommitOneShotLodgingMainOfferResult = {
  readonly committed: boolean;
  readonly placeId: string | null;
  readonly expressOpened: boolean;
};

/** After scout — auto-pin MAIN lodging + room cards; express when vault ready. */
export function commitOneShotLodgingMainOfferClient(input: {
  contextEventId: string;
  triggerMessage: string;
  outcome: ContextConditionAnchorPinOutcome;
  event: EventCandidate | null | undefined;
  userLat?: number | null;
  userLng?: number | null;
  prepResult?: RunOneShotLodgingPrepResult | null;
  expressReady?: boolean;
}): CommitOneShotLodgingMainOfferResult {
  const prep =
    input.prepResult?.plan ??
    planOneShotLodgingPrep({
      message: input.triggerMessage,
      event: input.event,
      userLat: input.userLat,
      userLng: input.userLng,
      expressReady: input.expressReady,
    });
  if (!prep?.readyForScout) {
    return { committed: false, placeId: null, expressOpened: false };
  }

  const main = resolveLodgingPrepMainRecommendation(input.outcome.recommendations);
  if (!main?.placeId) {
    return { committed: false, placeId: null, expressOpened: false };
  }

  pinContextConditionRecommendation({
    eventId: input.contextEventId,
    recommendation: main,
  });

  const refreshedEvent =
    findLifeEventCandidate(input.contextEventId) ?? input.event ?? null;
  const step = refreshedEvent
    ? resolveLodgingRoomCardStep(refreshedEvent, main.placeId)
    : null;
  if (step) {
    appendLodgingRoomCardsComposeTurn(input.contextEventId, {
      placeId: main.placeId,
      resourceId: step.resourceId,
      title: main.title,
    });
  }

  let expressOpened = false;
  if (prep.readyForExpress && step?.payload.roomOffers?.[0]) {
    const offer = step.payload.roomOffers[0];
    const session = prepareLodgingHubCheckout({
      contextEventId: step.contextEventId,
      resourceId: step.resourceId,
      payload: step.payload,
      offer: {
        id: offer.id,
        title: offer.title,
        occupancyLabelKo: offer.occupancyLabelKo,
        totalPriceKrw: offer.totalPriceKrw ?? null,
        priceKrw: offer.priceKrw ?? null,
        guestCount: offer.guestCount,
        refundable: offer.refundable,
        sourceLabelKo: offer.sourceLabelKo,
      },
    });
    if (session) {
      openExpressCheckoutFromPreparedSession({
        session,
        ownerKey: `${step.contextEventId}:${step.resourceId}`,
        offerId: offer.id,
      });
      expressOpened = true;
    }
  }

  return {
    committed: true,
    placeId: main.placeId,
    expressOpened,
  };
}
