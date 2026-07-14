"use client";

import { dispatchCapability } from "@/lib/capability-registry";
import { findContextHubLinkByKind } from "@/lib/globe/context-hub/list-context-hub-links";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";

export type OpenFlightBookingFieldResult = {
  readonly opened: boolean;
  readonly bookingUrl: string | null;
  readonly capabilityDispatched: boolean;
};

/** Field path — hub booking URL + BOOK_FLIGHT capability handoff. */
export function openFlightBookingFieldClient(input: {
  contextEventId: string;
  event?: EventCandidate | null;
  bookingUrl?: string | null;
  title?: string | null;
}): OpenFlightBookingFieldResult {
  const event =
    input.event ?? findLifeEventCandidate(input.contextEventId) ?? null;
  const hubLink = event
    ? findContextHubLinkByKind(event, "departure_airport")
    : null;
  const bookingUrl = input.bookingUrl?.trim() || hubLink?.actionUrl?.trim() || null;

  const capability = dispatchCapability({
    capabilityId: "BOOK_FLIGHT",
    inputs: {
      title: input.title?.trim() || event?.title?.trim() || "항공권",
      url: bookingUrl ?? "",
    },
    metadata: {
      surfaceId: input.contextEventId,
      eventId: input.contextEventId,
    },
  });

  if (bookingUrl && typeof window !== "undefined") {
    window.open(bookingUrl, "_blank", "noopener,noreferrer");
  }

  return {
    opened: Boolean(bookingUrl),
    bookingUrl,
    capabilityDispatched: capability.ok,
  };
}
