import type { EventCandidate } from "@/lib/events/event-candidate";
import { hasPendingFeedCaptureVerify } from "@/lib/feed/feed-capture-metadata";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import { isGlobeLocationConfirmed } from "@/lib/globe/globe-location-confirm-store";

export type PendingGlobeLocationConfirm = {
  eventId: string;
  title: string;
  place: string;
  datetime: string;
};

/** GPS background captures awaiting human confirm on globe. */
export function listPendingGlobeLocationConfirms(input?: {
  dismissedIds?: readonly string[];
  gpsEnabled?: boolean;
}): PendingGlobeLocationConfirm[] {
  if (input?.gpsEnabled === false) {
    return [];
  }

  const dismissed = new Set(input?.dismissedIds ?? []);
  const out: PendingGlobeLocationConfirm[] = [];

  for (const event of listLifeEventCandidates()) {
    if (event.metadata?.targetingSource !== "gps_background") {
      continue;
    }
    if (!hasPendingFeedCaptureVerify(event)) {
      continue;
    }
    if (dismissed.has(event.id)) {
      continue;
    }
    const place = event.place?.trim();
    if (place && isGlobeLocationConfirmed(place, event.datetime)) {
      continue;
    }
    out.push({
      eventId: event.id,
      title: event.title?.trim() || "체류 기록",
      place: place || "이 위치",
      datetime: event.datetime,
    });
  }

  return out;
}

export function isPendingGlobeLocationEvent(
  event: EventCandidate,
  dismissedIds: readonly string[],
): boolean {
  return listPendingGlobeLocationConfirms({ dismissedIds }).some(
    (row) => row.eventId === event.id,
  );
}
