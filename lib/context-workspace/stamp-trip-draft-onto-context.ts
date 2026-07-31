/**
 * Stamp trip Reality Draft slots onto the Context event so Work/Goal % advance.
 */

import type { TripPrepSlots } from "@/lib/action-planner/build-trip-prep-plan";
import { writeLodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { recordScheduleUpdated } from "@/lib/workstream/append-workstream-event";
import { syncContextGoalState } from "@/lib/workstream/context-goal-state";
import { syncContextWorkState } from "@/lib/workstream/sync-context-work-state";
import { resolveDestinationAnchor } from "@/lib/context-workspace/reality-draft/compile-trip-entity-slots";
import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";

function addDaysYmd(ymd: string, days: number): string {
  const ms = Date.parse(`${ymd}T12:00:00.000Z`);
  if (!Number.isFinite(ms)) return ymd;
  return new Date(ms + days * 86_400_000).toISOString().slice(0, 10);
}

function resolveStayWindow(input: {
  readonly tripPrep?: TripPrepSlots | null;
  readonly nights: number | null;
  readonly stayLabelKo: string | null;
}): { checkInIso: string; checkOutIso: string; nights: number } | null {
  const fromPrepIn = input.tripPrep?.checkInIso?.trim().slice(0, 10) || null;
  const fromPrepOut = input.tripPrep?.checkOutIso?.trim().slice(0, 10) || null;
  if (fromPrepIn && fromPrepOut) {
    const nights = Math.max(
      1,
      Math.round(
        (Date.parse(`${fromPrepOut}T12:00:00.000Z`) -
          Date.parse(`${fromPrepIn}T12:00:00.000Z`)) /
          86_400_000,
      ),
    );
    return { checkInIso: fromPrepIn, checkOutIso: fromPrepOut, nights };
  }

  let nights = input.nights;
  if (nights == null && input.stayLabelKo) {
    const m = /(\d+)\s*박/u.exec(input.stayLabelKo);
    if (m?.[1]) nights = Number.parseInt(m[1], 10);
  }
  if (nights == null || !Number.isFinite(nights) || nights < 1) {
    return null;
  }
  const checkInIso = new Date().toISOString().slice(0, 10);
  return {
    checkInIso,
    checkOutIso: addDaysYmd(checkInIso, nights),
    nights,
  };
}

/**
 * Persist destination + stay onto Context event after trip Workspace draft open.
 */
export function stampTripDraftOntoContext(input: {
  readonly contextEventId: string;
  readonly destinationKo: string;
  readonly stayLabelKo?: string | null;
  readonly nights?: number | null;
  readonly days?: number | null;
  readonly tripPrep?: TripPrepSlots | null;
}): {
  readonly stamped: boolean;
  readonly destinationKo: string;
  readonly checkInIso: string | null;
  readonly checkOutIso: string | null;
} {
  const contextEventId = input.contextEventId.trim();
  const destinationKo = input.destinationKo.trim();
  if (!contextEventId || !destinationKo || destinationKo === "여행지") {
    return {
      stamped: false,
      destinationKo,
      checkInIso: null,
      checkOutIso: null,
    };
  }

  const prev = findLifeEventCandidate(contextEventId);
  if (!prev) {
    // Still sync work from workspace-only signals below.
    syncContextWorkState({ contextEventId });
    syncContextGoalState({ contextEventId });
    return {
      stamped: false,
      destinationKo,
      checkInIso: null,
      checkOutIso: null,
    };
  }

  const stay = resolveStayWindow({
    tripPrep: input.tripPrep,
    nights: input.nights ?? input.tripPrep?.nights ?? null,
    stayLabelKo: input.stayLabelKo ?? null,
  });

  const now = new Date().toISOString();
  const title =
    input.stayLabelKo?.trim()
      ? `${destinationKo} · ${input.stayLabelKo.trim()}`
      : prev.title?.trim() || `${destinationKo} 여행`;

  let event = commitEventUpsert({
    id: prev.id,
    title,
    category: prev.category,
    source: prev.source,
    lifecycle: prev.lifecycle,
    datetime: stay?.checkInIso ?? prev.datetime,
    place: destinationKo,
    description: prev.description,
    confidence: prev.confidence,
    lifecycleUpdatedAt: now,
    updatedAt: now,
    metadata: {
      ...(prev.metadata ?? {}),
      globePlaceLabel: destinationKo,
      travelDestination: destinationKo,
      tripDestinationKo: destinationKo,
      ...(input.stayLabelKo?.trim()
        ? { tripStayLabelKo: input.stayLabelKo.trim() }
        : {}),
      ...(input.nights != null ? { tripNights: input.nights } : {}),
      ...(input.days != null ? { tripDays: input.days } : {}),
    },
  });

  if (stay) {
    try {
      event = writeLodgingBookingSlots({
        contextEventId,
        checkInIso: stay.checkInIso,
        checkOutIso: stay.checkOutIso,
        guestCount: 2,
        roomCount: 1,
      });
      recordScheduleUpdated({
        contextEventId,
        labelKo: input.stayLabelKo?.trim() || `${stay.nights}박`,
        nights: stay.nights,
        days: stay.nights + 1,
        scheduleLabel: input.stayLabelKo?.trim() || undefined,
        placeLabel: destinationKo,
      });
    } catch {
      /* stay window optional if event race */
    }
  }

  syncContextWorkState({ contextEventId, event });
  syncContextGoalState({ contextEventId, event });

  return {
    stamped: true,
    destinationKo,
    checkInIso: stay?.checkInIso ?? null,
    checkOutIso: stay?.checkOutIso ?? null,
  };
}

export function resolveWorkspaceMapCenter(
  destinationKo: string | null | undefined,
): { lat: number; lng: number } {
  return resolveDestinationAnchor(destinationKo?.trim() || "오사카");
}

/**
 * Prefer Context Event / Reality Draft destination over first pin coords.
 * Wrong lodging geocode (e.g. Seoul) must not steal Osaka Workspace camera.
 */
export function resolveWorkspaceContextDestinationKo(input: {
  readonly realityDraftDestinationKo?: string | null;
  readonly query?: string | null;
  readonly projectTitleKo?: string | null;
  readonly eventPlace?: string | null;
  readonly eventTitle?: string | null;
  readonly metadata?: Record<string, unknown> | null;
}): string {
  const meta = input.metadata ?? {};
  const candidates: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === "string" && value.trim()) {
      candidates.push(value.trim());
    }
  };
  push(input.realityDraftDestinationKo);
  push(meta.travelDestination);
  push(meta.tripDestinationKo);
  push(meta.globePlaceLabel);
  push(input.eventPlace);
  push(input.projectTitleKo);
  push(input.eventTitle);
  push(input.query);

  for (const raw of candidates) {
    if (raw === "여행지") continue;
    const extracted = extractTravelDestination(raw);
    if (extracted?.trim()) {
      return extracted.trim();
    }
  }

  for (const raw of candidates) {
    const cleaned = raw
      .replace(/\s*여행$/u, "")
      .replace(/\s*숙소.*$/u, "")
      .replace(/\s*호텔.*$/u, "")
      .trim();
    if (!cleaned || cleaned.length < 2) continue;
    if (/^(?:숙소|호텔|맛집|일정|맥락|여행)$/u.test(cleaned)) continue;
    return cleaned;
  }

  return "오사카";
}

export function resolveWorkspaceMapCenterFromContext(input: {
  readonly realityDraftDestinationKo?: string | null;
  readonly query?: string | null;
  readonly projectTitleKo?: string | null;
  readonly eventPlace?: string | null;
  readonly eventTitle?: string | null;
  readonly metadata?: Record<string, unknown> | null;
}): { lat: number; lng: number } {
  return resolveWorkspaceMapCenter(resolveWorkspaceContextDestinationKo(input));
}
