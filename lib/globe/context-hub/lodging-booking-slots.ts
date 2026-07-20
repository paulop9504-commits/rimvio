import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  areLodgingStayDatesValid,
  normalizeLodgingStayYmdPair,
} from "@/lib/globe/context-hub/lodging-booking-date-bounds";
import { buildLodgingStayWindow } from "@/lib/globe/context-hub/lodging-stay-window";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

const LODGING_GUEST_COUNT_META_KEY = "contextLodgingGuestCount";
const LODGING_ROOM_COUNT_META_KEY = "contextLodgingRoomCount";
const DAY_MS = 24 * 60 * 60 * 1000;

export type LodgingBookingSlots = {
  checkInIso: string | null;
  checkOutIso: string | null;
  guestCount: number | null;
  roomCount: number | null;
};

export function isLodgingBookingQuery(text: string): boolean {
  const trimmed = text.trim();
  return hasLodgingDomainCue(trimmed) || /room\b/iu.test(trimmed);
}

function coercePositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}

function toYmd(iso: string): string {
  return iso.trim().slice(0, 10);
}

/** Keep time-of-day from a prior ISO when only the calendar day shifts. */
function rebaseIsoDate(iso: string, ymd: string): string {
  const trimmed = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return ymd;
  }
  if (trimmed.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return `${ymd}${trimmed.slice(10)}`;
  }
  return ymd;
}

export function readLodgingBookingSlots(
  event: EventCandidate | null | undefined,
): LodgingBookingSlots {
  const stayWindow = buildLodgingStayWindow({ event: event ?? null });
  const metadata = event?.metadata ?? {};
  return {
    checkInIso: stayWindow?.checkInIso ?? null,
    checkOutIso: stayWindow?.checkOutIso ?? null,
    guestCount: coercePositiveInt(metadata[LODGING_GUEST_COUNT_META_KEY]),
    roomCount: coercePositiveInt(metadata[LODGING_ROOM_COUNT_META_KEY]) ?? 1,
  };
}

export function hasCompleteLodgingBookingSlots(
  slots: LodgingBookingSlots,
): boolean {
  if (
    !(
      slots.checkInIso &&
      slots.checkOutIso &&
      slots.guestCount &&
      slots.guestCount > 0 &&
      slots.roomCount &&
      slots.roomCount > 0
    )
  ) {
    return false;
  }
  // Past stay windows are not bookable — treat as incomplete so scout asks/heals.
  return areLodgingStayDatesValid({
    checkInYmd: toYmd(slots.checkInIso),
    checkOutYmd: toYmd(slots.checkOutIso),
  });
}

/**
 * Persist lodging stay slots. Past check-in is auto-shifted forward
 * (nights preserved) — never throw lodging_dates_in_past (that froze Context AI).
 */
export function writeLodgingBookingSlots(input: {
  contextEventId: string;
  checkInIso: string;
  checkOutIso: string;
  guestCount: number;
  roomCount: number;
}): EventCandidate {
  const stay = normalizeLodgingStayYmdPair({
    checkInYmd: toYmd(input.checkInIso),
    checkOutYmd: toYmd(input.checkOutIso),
  });
  const checkInIso = rebaseIsoDate(input.checkInIso, stay.checkInYmd);
  const checkOutIso = rebaseIsoDate(input.checkOutIso, stay.checkOutYmd);

  const event = findLifeEventCandidate(input.contextEventId.trim());
  if (!event) {
    throw new Error("event_not_found");
  }
  const updatedAt = new Date().toISOString();
  const nights = Math.max(
    1,
    Math.round(
      (new Date(`${stay.checkOutYmd}T12:00:00`).getTime() -
        new Date(`${stay.checkInYmd}T12:00:00`).getTime()) /
        DAY_MS,
    ) || 1,
  );
  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: checkInIso,
    place: event.place,
    description: event.description,
    confidence: event.confidence,
    lifecycleUpdatedAt: updatedAt,
    updatedAt,
    metadata: {
      ...(event.metadata ?? {}),
      planWindowEndIso: checkOutIso,
      planWindowConfidence: "confirmed",
      planNights: nights,
      [LODGING_GUEST_COUNT_META_KEY]: Math.max(1, Math.round(input.guestCount)),
      [LODGING_ROOM_COUNT_META_KEY]: Math.max(1, Math.round(input.roomCount)),
    },
  });
}
