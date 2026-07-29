import { copy } from "@/lib/copy/human-ko";
import {
  clearLodgingStayRevisePending,
  readLodgingStayRevisePending,
} from "@/lib/globe/context-hub/lodging-stay-revise-pending-store";
import {
  readLodgingBookingSlots,
  writeLodgingBookingSlots,
} from "@/lib/globe/context-hub/lodging-booking-slots";
import { buildLodgingBookingSlotChipLabels } from "@/lib/globe/context-hub/build-lodging-booking-slot-chip-labels";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { EVENT_CANDIDATES_UPDATED } from "@/lib/events/event-store";
import { recordScheduleUpdated } from "@/lib/workstream";

export type ApplyLodgingStayReviseResult =
  | { readonly ok: true; readonly summaryKo: string; readonly event: EventCandidate }
  | { readonly ok: false; readonly reason: "no_pending" | "write_failed"; readonly messageKo: string };

/** Human confirmed — write lodging slots (Reality mutation) + bump Globe Diff. */
export function applyLodgingStayRevisePending(input: {
  contextEventId: string;
}): ApplyLodgingStayReviseResult {
  const pending = readLodgingStayRevisePending(input.contextEventId);
  if (!pending) {
    return {
      ok: false,
      reason: "no_pending",
      messageKo: copy.globe.lodgingStayReviseCancelled,
    };
  }
  try {
    const updated = writeLodgingBookingSlots({
      contextEventId: input.contextEventId,
      checkInIso: pending.checkInIso,
      checkOutIso: pending.checkOutIso,
      guestCount: pending.guestCount,
      roomCount: pending.roomCount,
    });
    clearLodgingStayRevisePending(input.contextEventId);
    const chips = buildLodgingBookingSlotChipLabels(
      readLodgingBookingSlots(updated),
      updated,
    );
    const summaryKo =
      chips.join(" · ") ||
      copy.globe.lodgingStayReviseApplied(pending.summaryKo);
    recordScheduleUpdated({
      contextEventId: input.contextEventId,
      labelKo: summaryKo,
      scheduleLabel: pending.summaryKo,
      placeLabel:
        (typeof updated.place === "string" && updated.place.trim()) || null,
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(EVENT_CANDIDATES_UPDATED));
    }
    return { ok: true, summaryKo, event: updated };
  } catch {
    return {
      ok: false,
      reason: "write_failed",
      messageKo: copy.globe.lodgingSlotMissingToast,
    };
  }
}

export function cancelLodgingStayRevisePending(contextEventId: string): string {
  clearLodgingStayRevisePending(contextEventId);
  return copy.globe.lodgingStayReviseCancelled;
}
