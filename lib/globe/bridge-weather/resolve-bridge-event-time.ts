import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import type {
  BridgeEventTimeSource,
  ResolvedBridgeEventTime,
} from "@/lib/globe/bridge-weather/bridge-weather-types";

function parseMs(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function toEventDate(iso: string): string {
  const ms = parseMs(iso);
  if (ms === null) {
    return iso.slice(0, 10);
  }
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readEarliestPhotoCaptureIso(event: EventCandidate): string | null {
  const captures = readFeedCaptureFragments(event).filter(
    (row) => row.kind === "photo" || row.kind === "video",
  );
  if (captures.length === 0) {
    return null;
  }

  let bestIso: string | null = null;
  let bestMs = Number.POSITIVE_INFINITY;
  for (const capture of captures) {
    const iso = capture.capturedAtIso?.trim();
    if (!iso) {
      continue;
    }
    const ms = parseMs(iso);
    if (ms === null || ms >= bestMs) {
      continue;
    }
    bestMs = ms;
    bestIso = iso;
  }
  return bestIso;
}

function resolve(
  eventAtIso: string,
  source: BridgeEventTimeSource,
): ResolvedBridgeEventTime {
  return {
    eventAtIso,
    eventDate: toEventDate(eventAtIso),
    source,
  };
}

/**
 * Weather Resolution Priority:
 * 1. Photo EXIF / capture timestamp
 * 2. Event start date
 * 3. Visit date (plan window start when event datetime absent)
 * 4. Check-in / check-out window
 * 5. Bridge created date (last resort)
 */
export function resolveBridgeEventTime(
  event: EventCandidate,
): ResolvedBridgeEventTime | null {
  const photoIso = readEarliestPhotoCaptureIso(event);
  if (photoIso) {
    return resolve(photoIso, "photo_exif");
  }

  const eventStart = event.datetime?.trim();
  if (eventStart && parseMs(eventStart) !== null) {
    return resolve(eventStart, "event_start");
  }

  const meta = event.metadata ?? {};
  const visitIso =
    typeof meta.globeVisitDateIso === "string"
      ? meta.globeVisitDateIso.trim()
      : "";
  if (visitIso && parseMs(visitIso) !== null) {
    return resolve(visitIso, "visit_date");
  }

  const plan = readPlanContextFromEvent(event);
  const checkIn = plan?.windowStartIso?.trim();
  if (checkIn && parseMs(checkIn) !== null) {
    return resolve(checkIn, "check_in_out");
  }

  const checkOut = plan?.windowEndIso?.trim();
  if (checkOut && parseMs(checkOut) !== null) {
    return resolve(checkOut, "check_in_out");
  }

  const created = event.createdAt?.trim();
  if (created && parseMs(created) !== null) {
    return resolve(created, "bridge_created");
  }

  return null;
}
