"use client";

import {
  commitOneShotFlightMainClient,
  runOneShotFlightPrepClient,
  type RunOneShotFlightPrepResult,
} from "@/lib/globe/flight-prep/run-one-shot-flight-prep-client";
import { openFlightBookingFieldClient } from "@/lib/globe/flight-prep/open-flight-booking-field-client";
import type { EventCandidate } from "@/lib/events/event-candidate";

export type TryCompleteFlightPrepResult = {
  readonly prep: RunOneShotFlightPrepResult | null;
  readonly committed: boolean;
  readonly fieldOpened: boolean;
  readonly bookingUrl: string | null;
};

/** After slots/chips — connect hub when ready and open Field booking URL. */
export function tryCompleteFlightPrepClient(input: {
  message: string;
  contextEventId: string;
  event: EventCandidate | null | undefined;
  userLat?: number | null;
  userLng?: number | null;
  openField?: boolean;
}): TryCompleteFlightPrepResult {
  const prep = runOneShotFlightPrepClient({
    message: input.message,
    contextEventId: input.contextEventId,
    event: input.event,
    userLat: input.userLat,
    userLng: input.userLng,
  });
  if (!prep?.plan.readyForHub) {
    return {
      prep,
      committed: false,
      fieldOpened: false,
      bookingUrl: null,
    };
  }

  const commit = commitOneShotFlightMainClient({
    contextEventId: input.contextEventId,
    triggerMessage: input.message,
    event: prep.event,
    userLat: input.userLat,
    userLng: input.userLng,
    prepResult: prep,
  });
  if (!commit.committed) {
    return {
      prep,
      committed: false,
      fieldOpened: false,
      bookingUrl: null,
    };
  }

  const field =
    input.openField === false
      ? { opened: false, bookingUrl: commit.bookingUrl, capabilityDispatched: false }
      : openFlightBookingFieldClient({
          contextEventId: input.contextEventId,
          event: prep.event,
          bookingUrl: commit.bookingUrl,
        });

  return {
    prep,
    committed: true,
    fieldOpened: field.opened,
    bookingUrl: field.bookingUrl,
  };
}
