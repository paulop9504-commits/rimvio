import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";

/** Ignore epoch placeholders and pre-app garbage timestamps. */
export const PIN_DATE_MIN_MS = Date.UTC(2000, 0, 1);

export function parsePinDateMs(iso: string | null | undefined): number | null {
  const raw = iso?.trim();
  if (!raw) {
    return null;
  }
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms) || ms < PIN_DATE_MIN_MS) {
    return null;
  }
  return ms;
}

/** Pin open context — `2027.04.12` */
export function formatPinDateLabel(iso: string | null | undefined): string | null {
  const ms = parsePinDateMs(iso);
  if (ms === null) {
    return null;
  }
  const date = new Date(ms);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

/** First chronologically valid ISO among candidates. */
export function resolvePinDisplayIso(
  ...candidates: readonly (string | null | undefined)[]
): string | null {
  let bestIso: string | null = null;
  let bestMs = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const raw = candidate?.trim();
    if (!raw) {
      continue;
    }
    const ms = parsePinDateMs(raw);
    if (ms === null) {
      continue;
    }
    if (ms < bestMs) {
      bestMs = ms;
      bestIso = raw;
    }
  }

  return bestIso;
}

export function resolveEventPinStartedAtIso(
  event: EventCandidate | null | undefined,
  pinCreatedAtIso?: string | null,
): string | null {
  const captureIsos = event
    ? readFeedCaptureFragments(event).map((row) => row.capturedAtIso)
    : [];
  return resolvePinDisplayIso(
    event?.datetime,
    ...captureIsos,
    event?.createdAt,
    event?.updatedAt,
    pinCreatedAtIso,
  );
}
