import { copy } from "@/lib/copy/human-ko";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { LodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import {
  buildLodgingStayWindow,
  formatLodgingStayBadgeLabel,
} from "@/lib/globe/context-hub/lodging-stay-window";

/** Field-style chip labels for lodging slot bar (dates · guests · rooms). */
export function buildLodgingBookingSlotChipLabels(
  slots: LodgingBookingSlots,
  event?: EventCandidate | null,
): readonly string[] {
  const chips: string[] = [];
  const stayWindow = buildLodgingStayWindow({
    event: event ?? null,
  });
  const stay = formatLodgingStayBadgeLabel(stayWindow);
  if (stay) {
    chips.push(stay);
  } else if (slots.checkInIso && slots.checkOutIso) {
    chips.push(`${slots.checkInIso.slice(5, 10)}–${slots.checkOutIso.slice(5, 10)}`);
  }
  if (slots.guestCount && slots.guestCount > 0) {
    chips.push(copy.globe.lodgingSlotGuestChip(slots.guestCount));
  }
  if (slots.roomCount && slots.roomCount > 1) {
    chips.push(copy.globe.lodgingSlotRoomChip(slots.roomCount));
  }
  return chips;
}
