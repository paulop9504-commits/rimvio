import type { EventCandidate } from "@/lib/events/event-candidate";
import type { WorkQueueItem } from "@/lib/work-queue";

/** Pace preference only matters while route planning is active — not on passive recall. */
export function shouldOfferTravelPaceLearn(input: {
  event: EventCandidate | null;
  workQueue: readonly WorkQueueItem[];
  discoveryEventId?: string | null;
}): boolean {
  const eventId = input.event?.id?.trim();
  if (!eventId || input.event?.category !== "travel") {
    return false;
  }

  const discoveryId = input.discoveryEventId?.trim();
  if (discoveryId && discoveryId === eventId) {
    return true;
  }

  return input.workQueue.some(
    (item) =>
      item.kind === "travel_context" &&
      item.status === "slot_collect" &&
      (item.eventId?.trim() === eventId || !item.eventId?.trim()),
  );
}
