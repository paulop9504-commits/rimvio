import type { EventCandidate } from "@/lib/events/event-candidate";
import { shouldOfferTravelPaceLearn } from "@/lib/globe/travel/should-offer-travel-pace-learn";
import { findLatestPersonaSignal } from "@/lib/persona/persona-inference-store";
import {
  isPersonaPendingLearnDismissed,
  listPendingPersonaLearns,
  offerPersonaPendingLearn,
} from "@/lib/persona/persona-pending-learn-store";
import type { WorkQueueItem } from "@/lib/work-queue";

/** Ask travel pace only when discovery or travel slot collection is active. */
export function offerTravelPaceLearnIfNeeded(input: {
  event: EventCandidate | null;
  workQueue: readonly WorkQueueItem[];
  discoveryEventId?: string | null;
}): void {
  if (!shouldOfferTravelPaceLearn(input)) {
    return;
  }
  const event = input.event;
  if (!event) {
    return;
  }

  const existing = findLatestPersonaSignal("travel.pace");
  if (existing) {
    return;
  }

  const learnId = `travel-pace-${event.id}`;
  if (isPersonaPendingLearnDismissed(learnId)) {
    return;
  }
  const pending = listPendingPersonaLearns().find((row) => row.id === learnId);
  if (pending) {
    return;
  }

  const place = event.place?.trim() || event.title?.trim() || "이번 여행";
  offerPersonaPendingLearn({
    id: learnId,
    axisId: "travel.pace",
    titleKo: `${place} · 어떤 동선이 좋아요?`,
    kind: "help",
    eventId: event.id,
    autoExpand: true,
    choices: [
      {
        id: "packed",
        labelKo: "이동 많게",
        value: "packed",
      },
      {
        id: "relaxed",
        labelKo: "여유 있게",
        value: "relaxed",
      },
    ],
  });
}
