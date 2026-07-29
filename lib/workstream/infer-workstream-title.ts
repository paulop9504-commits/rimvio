/**
 * Infer display title from workstream residue (Untitled → named).
 */

import type { WorkstreamEvent, WorkstreamEventKind } from "@/lib/workstream/types";
import { isScratchWorkstreamTitle, WORKSTREAM_UNTITLED } from "@/lib/workstream/types";

const KIND_WEIGHT: Record<WorkstreamEventKind, number> = {
  HotelSelected: 3,
  HotelCommitted: 5,
  RestaurantAdded: 2,
  RentalAdded: 2,
  FlightCommitted: 4,
  ScheduleUpdated: 3,
  BudgetUpdated: 2,
  TitleInferred: 0,
};

function placeHintFromEvents(events: readonly WorkstreamEvent[]): string | null {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const p = events[i]?.payload;
    const place =
      (typeof p?.placeLabel === "string" && p.placeLabel.trim()) ||
      (typeof p?.destination === "string" && p.destination.trim()) ||
      null;
    if (place) return place;
  }
  return null;
}

function scheduleHint(events: readonly WorkstreamEvent[]): string | null {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i]?.kind !== "ScheduleUpdated") continue;
    const nights = events[i]?.payload?.nights;
    const days = events[i]?.payload?.days;
    if (typeof nights === "number" && typeof days === "number") {
      return `${nights}박${days}일`;
    }
    const label = events[i]?.payload?.scheduleLabel;
    if (typeof label === "string" && label.trim()) return label.trim();
  }
  return null;
}

function domainHint(events: readonly WorkstreamEvent[]): "travel" | "job" | "generic" {
  const blob = events.map((e) => e.labelKo).join(" ");
  if (/입사|연봉|서류|건강\s*검진|면접/u.test(blob)) return "job";

  const kinds = new Set(events.map((e) => e.kind));
  if (
    kinds.has("HotelSelected") ||
    kinds.has("HotelCommitted") ||
    kinds.has("RestaurantAdded") ||
    kinds.has("RentalAdded") ||
    kinds.has("FlightCommitted") ||
    kinds.has("ScheduleUpdated")
  ) {
    return "travel";
  }
  return "generic";
}

/**
 * Returns Untitled until residue is strong enough; then a short KO title.
 */
export function inferWorkstreamTitle(input: {
  readonly events: readonly WorkstreamEvent[];
  readonly currentTitle?: string | null;
  readonly placeLabel?: string | null;
}): string {
  const score = input.events.reduce(
    (acc, e) => acc + (KIND_WEIGHT[e.kind] ?? 0),
    0,
  );
  // Need more than one thin residue (e.g. HotelSelected alone stays Untitled).
  if (score < 5) {
    return isScratchWorkstreamTitle(input.currentTitle)
      ? WORKSTREAM_UNTITLED
      : (input.currentTitle?.trim() || WORKSTREAM_UNTITLED);
  }

  if (!isScratchWorkstreamTitle(input.currentTitle) && input.currentTitle?.trim()) {
    // Keep human / prior engine title unless still scratch.
    return input.currentTitle.trim();
  }

  const place =
    input.placeLabel?.trim() || placeHintFromEvents(input.events) || null;
  const schedule = scheduleHint(input.events);
  const domain = domainHint(input.events);

  if (domain === "travel") {
    if (place && schedule) return `${place} ${schedule} 여행`;
    if (place) return `${place} 여행`;
    if (schedule) return `${schedule} 여행`;
    return "여행 계획";
  }

  if (domain === "job") {
    return place ? `${place} 입사 준비` : "입사 준비";
  }

  return place ? `${place} 작업` : "작업 중";
}
