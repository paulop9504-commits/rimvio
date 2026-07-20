/**
 * Agent Runtime — prepare-only booking via Tool Registry + Execution Inbox.
 * Never Reality Commit. Preserves offerId / provider end-to-end for Commit.
 */

import { invokeRimvioTool } from "@/lib/tool-registry";
import { enqueuePlacePrepToExecutionInbox } from "@/lib/reality-queue/enqueue-place-prep-operation";
import type { PlacePrepEnqueueInput } from "@/lib/reality-queue/enqueue-place-prep-operation";
import { assertHumanRealityCommit } from "@/lib/reality-commit";
import type { BookingProviderId } from "@/lib/booking-runtime/types";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";

export type PrepareBookingAgentInput = {
  readonly contextEventId: string;
  readonly placeId: string;
  readonly placeName: string;
  readonly kind: "lodging" | "eatery" | "activity";
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly contextLabelKo?: string | null;
  readonly partySize?: number | null;
  readonly reserveAtLabelKo?: string | null;
  readonly reasonLinesKo?: readonly string[] | null;
  readonly googlePlaceId?: string | null;
  readonly liteapiOfferId?: string | null;
  readonly amountLabel?: string | null;
  readonly bookingProvider?: BookingProviderId | null;
  readonly utterance?: string | null;
  /** Must stay false unless Field CEO Sign already approved. */
  readonly approvedByHuman?: boolean;
};

/**
 * Domain agent: booking prepare. Rejects if caller tries to skip human Commit.
 */
export function runBookingPrepareAgent(
  input: PrepareBookingAgentInput,
): {
  readonly ok: true;
  readonly operation: RealityOperationV1;
  readonly toolSummaryKo: string;
} | {
  readonly ok: false;
  readonly reasonKo: string;
} {
  if (input.approvedByHuman) {
    const gate = assertHumanRealityCommit({
      contextEventId: input.contextEventId,
      operationIds: ["pending"],
      approvedByHuman: true,
    });
    // approved path still only prepares here — actual book is Field commit client.
    if (!gate.allowed) {
      return { ok: false, reasonKo: gate.reasonKo };
    }
  }

  const tool = invokeRimvioTool("booking.prepare", {
    contextEventId: input.contextEventId,
    placeId: input.placeId,
    placeName: input.placeName,
    lat: input.lat,
    lng: input.lng,
    utterance: input.utterance,
  });

  const enqueueInput: PlacePrepEnqueueInput = {
    contextEventId: input.contextEventId,
    contextLabelKo: input.contextLabelKo,
    placeId: input.placeId,
    placeName: input.placeName,
    kind: input.kind,
    partySize: input.partySize ?? 2,
    reserveAtLabelKo: input.reserveAtLabelKo ?? "19:00",
    reasonLinesKo: [
      "에이전트 · 예약 준비",
      tool.summaryKo,
      ...(input.reasonLinesKo ?? []),
    ],
    lat: input.lat,
    lng: input.lng,
    googlePlaceId: input.googlePlaceId,
    liteapiOfferId: input.liteapiOfferId,
    amountLabel: input.amountLabel,
    bookingProvider: input.bookingProvider,
  };

  const operation = enqueuePlacePrepToExecutionInbox(enqueueInput);

  return {
    ok: true,
    operation,
    toolSummaryKo: tool.summaryKo,
  };
}
