"use client";

import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { inferWorkstreamTitle } from "@/lib/workstream/infer-workstream-title";
import {
  isScratchWorkstreamTitle,
  SELECTION_CANDIDATE_CONFIDENCE,
  type WorkstreamEvent,
  type WorkstreamEventKind,
  type WorkstreamState,
} from "@/lib/workstream/types";
import {
  ensureWorkstream,
  writeWorkstream,
} from "@/lib/workstream/workstream-store";
import { syncContextWorkState } from "@/lib/workstream/sync-context-work-state";

function newEventId(kind: WorkstreamEventKind): string {
  return `ws:${kind}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Append a meaningful work residue event.
 * Do NOT call for search / scout / candidate refresh (ephemeral).
 */
export function appendWorkstreamEvent(input: {
  readonly contextEventId: string;
  readonly kind: WorkstreamEventKind;
  readonly labelKo: string;
  readonly objectId?: string | null;
  readonly placeId?: string | null;
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly placeLabel?: string | null;
  /** When true, may rename Untitled EventCandidate title. */
  readonly retitleContext?: boolean;
}): WorkstreamState {
  const contextEventId = input.contextEventId.trim();
  const prev = ensureWorkstream(contextEventId);
  const atIso = new Date().toISOString();
  const event: WorkstreamEvent = {
    id: newEventId(input.kind),
    kind: input.kind,
    atIso,
    contextEventId,
    labelKo: input.labelKo.trim() || input.kind,
    objectId: input.objectId ?? null,
    placeId: input.placeId ?? null,
    payload: {
      ...(input.payload ?? {}),
      ...(input.placeLabel?.trim()
        ? { placeLabel: input.placeLabel.trim() }
        : {}),
    },
  };
  const events = [...prev.events, event].slice(-80);
  const title = inferWorkstreamTitle({
    events,
    currentTitle: prev.title,
    placeLabel: input.placeLabel,
  });
  const phase: WorkstreamState["phase"] =
    input.kind === "HotelCommitted" || input.kind === "FlightCommitted"
      ? "committed"
      : title !== prev.title && !isScratchWorkstreamTitle(title)
        ? "named"
        : prev.phase === "scratch" && !isScratchWorkstreamTitle(title)
          ? "named"
          : prev.phase;

  const next: WorkstreamState = {
    contextEventId,
    title,
    phase,
    events,
    updatedAtIso: atIso,
  };
  writeWorkstream(next);

  if (input.retitleContext !== false && !isScratchWorkstreamTitle(title)) {
    maybeRetitleContextEvent({
      contextEventId,
      title,
      atIso,
    });
  }

  syncContextWorkState({
    contextEventId,
    event: findLifeEventCandidate(contextEventId),
  });

  return next;
}

function maybeRetitleContextEvent(input: {
  readonly contextEventId: string;
  readonly title: string;
  readonly atIso: string;
}): void {
  const event = findLifeEventCandidate(input.contextEventId);
  if (!event) return;
  if (!isScratchWorkstreamTitle(event.title) && event.title.trim()) {
    // Keep user-visible destination titles like 「도쿄 여행」.
    return;
  }
  commitEventUpsert({
    id: event.id,
    title: input.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    description: event.description,
    confidence: event.confidence,
    lifecycleUpdatedAt: input.atIso,
    updatedAt: input.atIso,
    metadata: {
      ...event.metadata,
      workstreamTitle: input.title,
      workstreamTitledAtIso: input.atIso,
    },
  });
}

export function recordHotelSelected(input: {
  readonly contextEventId: string;
  readonly labelKo: string;
  readonly placeId?: string | null;
  readonly objectId?: string | null;
  readonly placeLabel?: string | null;
}): WorkstreamState {
  return appendWorkstreamEvent({
    ...input,
    kind: "HotelSelected",
    labelKo: input.labelKo || "호텔 선택",
    payload: {
      confidence: SELECTION_CANDIDATE_CONFIDENCE,
      status: "candidate",
    },
  });
}

export function recordHotelCommitted(input: {
  readonly contextEventId: string;
  readonly labelKo: string;
  readonly placeId?: string | null;
  readonly objectId?: string | null;
  readonly placeLabel?: string | null;
  readonly locationLabel?: string | null;
  readonly checkInYmd?: string | null;
  readonly checkOutYmd?: string | null;
}): WorkstreamState {
  return appendWorkstreamEvent({
    contextEventId: input.contextEventId,
    kind: "HotelCommitted",
    labelKo: input.labelKo || "호텔 확정",
    placeId: input.placeId,
    objectId: input.objectId,
    placeLabel: input.placeLabel,
    payload: {
      status: "confirmed",
      confidence: 1,
      locationLabel: input.locationLabel,
      checkInYmd: input.checkInYmd,
      checkOutYmd: input.checkOutYmd,
    },
  });
}

export function recordFlightCommitted(input: {
  readonly contextEventId: string;
  readonly labelKo: string;
  readonly placeLabel?: string | null;
  readonly arrivalAtIso?: string | null;
}): WorkstreamState {
  return appendWorkstreamEvent({
    contextEventId: input.contextEventId,
    kind: "FlightCommitted",
    labelKo: input.labelKo || "항공 확정",
    placeLabel: input.placeLabel,
    payload: {
      status: "confirmed",
      confidence: 1,
      arrivalAtIso: input.arrivalAtIso,
    },
  });
}

export function recordRestaurantAdded(input: {
  readonly contextEventId: string;
  readonly labelKo: string;
  readonly placeId?: string | null;
  readonly objectId?: string | null;
  readonly placeLabel?: string | null;
}): WorkstreamState {
  return appendWorkstreamEvent({
    ...input,
    kind: "RestaurantAdded",
    labelKo: input.labelKo || "맛집 추가",
  });
}

export function recordScheduleUpdated(input: {
  readonly contextEventId: string;
  readonly labelKo: string;
  readonly nights?: number;
  readonly days?: number;
  readonly scheduleLabel?: string;
  readonly placeLabel?: string | null;
}): WorkstreamState {
  return appendWorkstreamEvent({
    contextEventId: input.contextEventId,
    kind: "ScheduleUpdated",
    labelKo: input.labelKo || "일정 변경",
    placeLabel: input.placeLabel,
    payload: {
      nights: input.nights,
      days: input.days,
      scheduleLabel: input.scheduleLabel,
    },
  });
}

export function recordBudgetUpdated(input: {
  readonly contextEventId: string;
  readonly labelKo: string;
  readonly amountKrw?: number;
  readonly placeLabel?: string | null;
}): WorkstreamState {
  return appendWorkstreamEvent({
    contextEventId: input.contextEventId,
    kind: "BudgetUpdated",
    labelKo: input.labelKo || "예산 수정",
    placeLabel: input.placeLabel,
    payload: { amountKrw: input.amountKrw },
  });
}
