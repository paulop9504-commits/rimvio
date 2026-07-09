import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildLodgingStayWindow } from "@/lib/globe/context-hub/lodging-stay-window";
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
  return /숙소|호텔|숙박|stay|lodging|hotel|room/iu.test(text.trim());
}

function coercePositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
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
  return Boolean(
    slots.checkInIso &&
      slots.checkOutIso &&
      slots.guestCount &&
      slots.guestCount > 0 &&
      slots.roomCount &&
      slots.roomCount > 0,
  );
}

export function writeLodgingBookingSlots(input: {
  contextEventId: string;
  checkInIso: string;
  checkOutIso: string;
  guestCount: number;
  roomCount: number;
}): EventCandidate {
  const event = findLifeEventCandidate(input.contextEventId.trim());
  if (!event) {
    throw new Error("event_not_found");
  }
  const updatedAt = new Date().toISOString();
  const nights = Math.max(
    1,
    Math.round(
      (new Date(input.checkOutIso).getTime() - new Date(input.checkInIso).getTime()) / DAY_MS,
    ) || 1,
  );
  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: input.checkInIso,
    place: event.place,
    description: event.description,
    confidence: event.confidence,
    lifecycleUpdatedAt: updatedAt,
    updatedAt,
    metadata: {
      ...(event.metadata ?? {}),
      planWindowEndIso: input.checkOutIso,
      planWindowConfidence: "confirmed",
      planNights: nights,
      [LODGING_GUEST_COUNT_META_KEY]: Math.max(1, Math.round(input.guestCount)),
      [LODGING_ROOM_COUNT_META_KEY]: Math.max(1, Math.round(input.roomCount)),
    },
  });
}
