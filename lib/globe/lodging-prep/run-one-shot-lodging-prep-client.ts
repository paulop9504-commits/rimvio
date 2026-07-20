"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { planOneShotLodgingPrep,
  type OneShotLodgingPrepPlan,
} from "@/lib/globe/lodging-prep/plan-one-shot-lodging-prep";
import { openLodgingCheckoutState } from "@/lib/globe/hub-checkout/lodging-checkout-controller";
import { prepareLodgingHubCheckout } from "@/lib/globe/hub-checkout/prepare-lodging-hub-checkout";
import { writeContextSpatialTargetFromText } from "@/lib/globe/spatial/write-context-spatial-target-from-text";
import { writeTripIntakeSlots } from "@/lib/globe/trip-intake/write-trip-intake-slots";
import { writeTripIntakePartial } from "@/lib/globe/trip-intake/write-trip-intake-partial";
import type { TripIntakeState } from "@/lib/globe/trip-intake/types";

export type RunOneShotLodgingPrepResult = {
  readonly plan: OneShotLodgingPrepPlan;
  readonly event: EventCandidate | null;
};

function canWriteTripIntake(state: TripIntakeState): boolean {
  return Boolean(
    state.destinationLabel &&
      state.originLabel &&
      state.checkInIso &&
      state.checkOutIso &&
      state.guestCount &&
      state.budgetBand,
  );
}

/** Client — persist spatial POV + intake, return scout-ready plan. */
export function runOneShotLodgingPrepClient(input: {
  message: string;
  contextEventId: string;
  event: EventCandidate | null | undefined;
  userLat?: number | null;
  userLng?: number | null;
  now?: Date;
  expressReady?: boolean;
}): RunOneShotLodgingPrepResult | null {
  const plan = planOneShotLodgingPrep({
    message: input.message,
    event: input.event,
    userLat: input.userLat,
    userLng: input.userLng,
    now: input.now,
    expressReady: input.expressReady,
  });
  if (!plan) {
    return null;
  }

  let event = input.event ?? null;
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return { plan, event };
  }

  try {
    const spatialWrite = writeContextSpatialTargetFromText({
      contextEventId,
      text: input.message,
    });
    if (spatialWrite.event) {
      event = spatialWrite.event;
    }

    if (canWriteTripIntake(plan.intakeState)) {
      event = writeTripIntakeSlots({
        contextEventId,
        destinationLabel: plan.intakeState.destinationLabel!,
        originLabel: plan.intakeState.originLabel!,
        checkInIso: plan.intakeState.checkInIso!,
        checkOutIso: plan.intakeState.checkOutIso!,
        guestCount: plan.intakeState.guestCount!,
        budgetBand: plan.intakeState.budgetBand ?? "balanced",
      });
    } else {
      event = writeTripIntakePartial({
        contextEventId,
        state: {
          ...plan.intakeState,
          guestCount: plan.intakeState.guestCount ?? 1,
          budgetBand: plan.intakeState.budgetBand ?? "balanced",
        },
      });
    }
  } catch {
    // Never block scout/compose on intake write — past dates are normalized
    // in writeLodgingBookingSlots; other failures still allow resolve to run.
    return { plan, event };
  }

  return { plan, event };
}

export function openExpressCheckoutFromPreparedSession(input: {
  session: NonNullable<ReturnType<typeof prepareLodgingHubCheckout>>;
  ownerKey: string;
  offerId: string;
}): void {
  openLodgingCheckoutState({
    mode: "express",
    session: input.session,
    ownerKey: input.ownerKey,
    offerId: input.offerId,
  });
}
