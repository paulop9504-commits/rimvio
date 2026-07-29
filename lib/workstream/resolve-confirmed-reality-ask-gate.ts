/**
 * Confirmed Reality → never re-ask (Context OS vs chatbot).
 * @see docs/adr/037-reality-commit-confirms-context.md
 *
 * 확정된 Reality → 묻지 않는다
 * 추론 가능한 정보 → 알아서 채운다
 * 결정이 필요한 정보 → 최소 질문 / 행동 제안
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readLodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import type { TripIntakeGapId } from "@/lib/globe/trip-intake/types";
import {
  expandTripPeriodFromSegments,
  readTripStaySegments,
} from "@/lib/workstream/build-stay-timeline";
import { computeContextCompleteness } from "@/lib/workstream/compute-context-completeness";
import { readWorkstream } from "@/lib/workstream/workstream-store";
import type { WorkstreamState } from "@/lib/workstream/types";

export type ConfirmedRealityAskSlot =
  | "dates"
  | "guests"
  | "budget"
  | "lodging"
  | "destination"
  | "duration"
  | "flight";

export type ConfirmedRealityKnownFacts = {
  readonly destinationLabel: string | null;
  readonly checkInYmd: string | null;
  readonly checkOutYmd: string | null;
  readonly nights: number | null;
  readonly days: number | null;
  readonly guestCount: number | null;
  readonly budgetKnown: boolean;
  readonly lodgingCommitted: boolean;
  readonly lodgingSelected: boolean;
  readonly staySegmentConfirmed: boolean;
  readonly flightCommitted: boolean;
};

export type ConfirmedRealityAskGate = {
  readonly knownFacts: ConfirmedRealityKnownFacts;
  readonly askForbiddenSlots: readonly ConfirmedRealityAskSlot[];
  /** Prefer over “입력해주세요” quizzes. */
  readonly actionProposalsKo: readonly string[];
  readonly completenessPercent: number;
};

function ymd(iso: string | null | undefined): string | null {
  const t = iso?.trim();
  if (!t || t.length < 10) return null;
  const slice = t.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : null;
}

/**
 * Pure gate — EventCandidate + workstream → what we must never re-quiz.
 */
export function resolveConfirmedRealityAskGate(input: {
  readonly event?: EventCandidate | null;
  readonly workstream?: WorkstreamState | null;
  readonly contextEventId?: string | null;
}): ConfirmedRealityAskGate {
  const event = input.event ?? null;
  const contextEventId =
    input.contextEventId?.trim() ||
    event?.id?.trim() ||
    "";
  const ws =
    input.workstream ??
    (contextEventId ? readWorkstream(contextEventId) : null);
  const kinds = new Set((ws?.events ?? []).map((e) => e.kind));
  const slots = readLodgingBookingSlots(event);
  const segments = readTripStaySegments(event?.metadata ?? null);
  const confirmedSegments = segments.filter((s) => s.status === "confirmed");
  const period = expandTripPeriodFromSegments(segments);

  const checkInYmd =
    period?.checkInYmd ??
    ymd(slots.checkInIso) ??
    confirmedSegments[0]?.checkInYmd ??
    null;
  const checkOutYmd =
    period?.checkOutYmd ??
    ymd(slots.checkOutIso) ??
    confirmedSegments[confirmedSegments.length - 1]?.checkOutYmd ??
    null;

  const destinationLabel =
    (typeof event?.place === "string" && event.place.trim()) ||
    (typeof event?.metadata?.globePlaceLabel === "string"
      ? event.metadata.globePlaceLabel.trim()
      : null) ||
    (typeof event?.metadata?.travelDestination === "string"
      ? event.metadata.travelDestination.trim()
      : null) ||
    null;

  const lodgingCommitted =
    kinds.has("HotelCommitted") || confirmedSegments.length > 0;
  const lodgingSelected =
    lodgingCommitted || kinds.has("HotelSelected");
  const budgetKnown = kinds.has("BudgetUpdated");
  const flightCommitted = kinds.has("FlightCommitted");
  const datesKnown = Boolean(checkInYmd && checkOutYmd);
  const guestsKnown = Boolean(slots.guestCount && slots.guestCount > 0);

  const askForbiddenSlots: ConfirmedRealityAskSlot[] = [];
  if (datesKnown) {
    askForbiddenSlots.push("dates", "duration");
  }
  if (guestsKnown) askForbiddenSlots.push("guests");
  if (budgetKnown) askForbiddenSlots.push("budget");
  if (lodgingCommitted || lodgingSelected) askForbiddenSlots.push("lodging");
  if (destinationLabel) askForbiddenSlots.push("destination");
  if (flightCommitted) askForbiddenSlots.push("flight");

  const completeness = contextEventId
    ? computeContextCompleteness({ contextEventId, event })
    : { percent: 0, gaps: [], missing: [] };

  const actionProposalsKo = buildRealityActionProposalsKo({
    destinationLabel,
    checkInYmd,
    lodgingCommitted,
    flightCommitted,
    completenessMissingIds: completeness.missing.map((m) => m.id),
  });

  return {
    knownFacts: {
      destinationLabel,
      checkInYmd,
      checkOutYmd,
      nights: period?.nights ?? null,
      days: period?.days ?? null,
      guestCount: slots.guestCount,
      budgetKnown,
      lodgingCommitted,
      lodgingSelected,
      staySegmentConfirmed: confirmedSegments.length > 0,
      flightCommitted,
    },
    askForbiddenSlots,
    actionProposalsKo,
    completenessPercent: completeness.percent,
  };
}

export function filterTripIntakeGapsByConfirmedReality(
  gaps: readonly TripIntakeGapId[],
  gate: ConfirmedRealityAskGate,
): TripIntakeGapId[] {
  const forbidden = new Set(gate.askForbiddenSlots);
  return gaps.filter((gap) => {
    if (gap === "dates" && forbidden.has("dates")) return false;
    if (gap === "guests" && forbidden.has("guests")) return false;
    if (gap === "budget" && forbidden.has("budget")) return false;
    if (gap === "destination" && forbidden.has("destination")) return false;
    // origin is soft — never hard-quiz when stay Reality is confirmed
    if (gap === "origin" && gate.knownFacts.lodgingCommitted) return false;
    return true;
  });
}

function buildRealityActionProposalsKo(input: {
  readonly destinationLabel: string | null;
  readonly checkInYmd: string | null;
  readonly lodgingCommitted: boolean;
  readonly flightCommitted: boolean;
  readonly completenessMissingIds: readonly string[];
}): string[] {
  const place = input.destinationLabel?.trim() || "여행지";
  const out: string[] = [];
  const missing = new Set(input.completenessMissingIds);

  if (input.lodgingCommitted && missing.has("flight") && !input.flightCommitted) {
    const day = input.checkInYmd
      ? `${Number(input.checkInYmd.slice(5, 7))}/${Number(input.checkInYmd.slice(8, 10))}`
      : "첫날";
    out.push(
      `${day} 오전 도착 항공편을 기준으로 보면 첫날 ${place} 일정이 가능합니다. 항공권을 연결하면 이동 시간을 자동 조정할게요.`,
    );
  }

  if (missing.has("food_pref")) {
    out.push(`${place} 근처 맛집을 이어서 맞춰 볼까요?`);
  }

  if (missing.has("transport") && input.lodgingCommitted) {
    out.push(`숙소 사이를 잇는 이동 동선을 잡아 드릴게요.`);
  }

  if (out.length === 0 && input.lodgingCommitted) {
    out.push(`확정된 숙소·날짜를 기준으로 다음 일정을 이어서 채울게요.`);
  }

  return out.slice(0, 3);
}

/** True when asking this travel clarify slot would violate confirmed Reality. */
export function shouldSkipTravelSlotAsk(
  slot: "destination" | "duration" | "anchor_time" | "origin_location",
  gate: ConfirmedRealityAskGate,
): boolean {
  const forbidden = new Set(gate.askForbiddenSlots);
  if (slot === "destination" && forbidden.has("destination")) return true;
  if (slot === "duration" && forbidden.has("duration")) return true;
  if (slot === "anchor_time" && forbidden.has("dates")) return true;
  if (slot === "origin_location" && gate.knownFacts.lodgingCommitted) return true;
  return false;
}
