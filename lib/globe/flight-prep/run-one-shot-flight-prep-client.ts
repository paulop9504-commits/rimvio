"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { connectDepartureHubToContext } from "@/lib/globe/connect-departure-hub-to-context";
import { buildContextHubFlightBooking } from "@/lib/globe/context-hub/build-context-hub-flight-booking-url";
import {
  planOneShotFlightPrep,
  type OneShotFlightPrepPlan,
} from "@/lib/globe/flight-prep/plan-one-shot-flight-prep";
import { inferDepartureHubHypothesis } from "@/lib/globe/infer-departure-hub-hypothesis";
import { writeTripIntakePartial } from "@/lib/globe/trip-intake/write-trip-intake-partial";
import { writeTripIntakeSlots } from "@/lib/globe/trip-intake/write-trip-intake-slots";
import type { TripIntakeState } from "@/lib/globe/trip-intake/types";
import { recordEngineLifecycleClient } from "@/lib/engine/record-engine-lifecycle";
import { findLifeEventCandidate } from "@/lib/life-read-model";

export type RunOneShotFlightPrepResult = {
  readonly plan: OneShotFlightPrepPlan;
  readonly event: EventCandidate | null;
};

function addDaysYmd(ymd: string, days: number): string {
  const date = new Date(`${ymd.slice(0, 10)}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function canWriteFlightIntake(state: TripIntakeState): boolean {
  return Boolean(
    state.destinationLabel?.trim() &&
      state.originLabel?.trim() &&
      state.checkInIso?.trim(),
  );
}

/** Client — persist intake slots before flight hub connect. */
export function runOneShotFlightPrepClient(input: {
  message: string;
  contextEventId: string;
  event: EventCandidate | null | undefined;
  userLat?: number | null;
  userLng?: number | null;
  now?: Date;
}): RunOneShotFlightPrepResult | null {
  const plan = planOneShotFlightPrep({
    message: input.message,
    event: input.event,
    userLat: input.userLat,
    userLng: input.userLng,
    now: input.now,
  });
  if (!plan) {
    return null;
  }

  let event = input.event ?? null;
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return { plan, event };
  }

  const state = plan.intakeState;
  if (canWriteFlightIntake(state)) {
    const checkOutIso = state.checkOutIso?.trim() || addDaysYmd(state.checkInIso!, 1);
    event = writeTripIntakeSlots({
      contextEventId,
      destinationLabel: state.destinationLabel!,
      originLabel: state.originLabel!,
      checkInIso: state.checkInIso!,
      checkOutIso,
      guestCount: state.guestCount ?? 1,
      budgetBand: state.budgetBand ?? "balanced",
    });
  } else {
    event = writeTripIntakePartial({
      contextEventId,
      state: {
        ...state,
        guestCount: state.guestCount ?? 1,
        budgetBand: state.budgetBand ?? "balanced",
      },
    });
  }

  return { plan, event };
}

export type CommitOneShotFlightMainResult = {
  readonly committed: boolean;
  readonly bookingUrl: string | null;
  readonly airportId: string | null;
};

/** Connect departure hub + expose flight booking URL — no auto external commit. */
export function commitOneShotFlightMainClient(input: {
  contextEventId: string;
  triggerMessage: string;
  event: EventCandidate | null | undefined;
  userLat?: number | null;
  userLng?: number | null;
  prepResult?: RunOneShotFlightPrepResult | null;
}): CommitOneShotFlightMainResult {
  const prep =
    input.prepResult?.plan ??
    planOneShotFlightPrep({
      message: input.triggerMessage,
      event: input.event,
      userLat: input.userLat,
      userLng: input.userLng,
    });
  if (!prep?.readyForHub) {
    return { committed: false, bookingUrl: null, airportId: null };
  }

  const destinationLabel = prep.intakeState.destinationLabel?.trim();
  if (!destinationLabel) {
    return { committed: false, bookingUrl: null, airportId: null };
  }

  const hypothesis = inferDepartureHubHypothesis({
    destinationLabel,
    viewerLat: input.userLat,
    viewerLng: input.userLng,
  });
  if (!hypothesis) {
    return { committed: false, bookingUrl: null, airportId: null };
  }

  connectDepartureHubToContext({
    destinationEventId: input.contextEventId,
    airportId: hypothesis.hub.id,
    homeRegionHint: hypothesis.homeLabel,
  });

  const booking = buildContextHubFlightBooking({
    airport: hypothesis.hub,
    destinationPlace: destinationLabel,
    departDateIso: prep.intakeState.checkInIso,
  });

  recordEngineLifecycleClient({
    contextEventId: input.contextEventId,
    engineId: "flight_booking",
    kind: "main_selected",
    payload: {
      bookingUrl: booking.url,
      airportId: hypothesis.hub.id,
      provider: booking.provider,
    },
  });

  return {
    committed: true,
    bookingUrl: booking.url,
    airportId: hypothesis.hub.id,
  };
}
