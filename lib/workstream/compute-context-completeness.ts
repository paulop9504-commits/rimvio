/**
 * Context Completeness — missing Reality nodes after Commit densify (ADR-037).
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readLodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import { summarizeContextRecall } from "@/lib/globe/context-hub/summarize-context-recall";
import { readWorkstream } from "@/lib/workstream/workstream-store";
import type { WorkstreamEventKind } from "@/lib/workstream/types";

export type ContextCompletenessGapId =
  | "lodging"
  | "flight"
  | "transport"
  | "guests"
  | "budget"
  | "food_pref";

export type ContextCompletenessGap = {
  readonly id: ContextCompletenessGapId;
  readonly labelKo: string;
  readonly filled: boolean;
};

export type ContextCompleteness = {
  readonly percent: number;
  readonly gaps: readonly ContextCompletenessGap[];
  readonly missing: readonly ContextCompletenessGap[];
};

const GAP_DEFS: readonly {
  id: ContextCompletenessGapId;
  labelKo: string;
}[] = [
  { id: "lodging", labelKo: "숙소" },
  { id: "flight", labelKo: "항공권" },
  { id: "transport", labelKo: "이동수단" },
  { id: "guests", labelKo: "여행자 수" },
  { id: "budget", labelKo: "예산" },
  { id: "food_pref", labelKo: "선호 음식" },
];

function hasKind(
  kinds: ReadonlySet<WorkstreamEventKind>,
  ...want: WorkstreamEventKind[]
): boolean {
  return want.some((k) => kinds.has(k));
}

export function computeContextCompleteness(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
}): ContextCompleteness {
  const ws = readWorkstream(input.contextEventId);
  const kinds = new Set((ws?.events ?? []).map((e) => e.kind));
  const event = input.event ?? null;
  const recall = summarizeContextRecall(event);
  const slots = readLodgingBookingSlots(event);

  const filledById: Record<ContextCompletenessGapId, boolean> = {
    lodging:
      recall.hasLodging ||
      hasKind(kinds, "HotelCommitted", "HotelSelected"),
    flight: recall.hasFlight || hasKind(kinds, "FlightCommitted"),
    transport: hasKind(kinds, "RentalAdded"),
    guests: Boolean(slots.guestCount && slots.guestCount > 0),
    budget: hasKind(kinds, "BudgetUpdated"),
    food_pref: hasKind(kinds, "RestaurantAdded"),
  };

  const gaps: ContextCompletenessGap[] = GAP_DEFS.map((d) => ({
    id: d.id,
    labelKo: d.labelKo,
    filled: filledById[d.id],
  }));
  const filledCount = gaps.filter((g) => g.filled).length;
  const percent = Math.round((filledCount / gaps.length) * 100);

  return {
    percent,
    gaps,
    missing: gaps.filter((g) => !g.filled),
  };
}
