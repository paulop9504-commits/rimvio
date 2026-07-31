/**
 * Rebuild Context Work State from Reality residue + completeness.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readLodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import { computeContextCompleteness } from "@/lib/workstream/compute-context-completeness";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import {
  CONTEXT_WORK_SLOT_LABEL_KO,
  type ContextWorkNextAction,
  type ContextWorkSlotId,
  type ContextWorkState,
  type ContextWorkStatus,
} from "@/lib/workstream/context-work-state";
import { expandTripPeriodFromSegments, readTripStaySegments } from "@/lib/workstream/build-stay-timeline";
import {
  ensureWorkstream,
  readWorkstream,
} from "@/lib/workstream/workstream-store";
import type { WorkstreamState } from "@/lib/workstream/types";

function nextActionsForPending(
  pending: readonly ContextWorkSlotId[],
): ContextWorkNextAction[] {
  const out: ContextWorkNextAction[] = [];
  for (const slot of pending) {
    switch (slot) {
      case "lodging":
        out.push({
          id: "search_hotel",
          labelKo: "숙소 찾기",
          enqueueUtterance: "숙소 찾아줘",
          slotId: slot,
        });
        break;
      case "flight":
        out.push({
          id: "search_flight",
          labelKo: "항공권 연결",
          enqueueUtterance: "항공권 찾아줘",
          slotId: slot,
        });
        break;
      case "food":
        out.push({
          id: "search_eatery",
          labelKo: "맛집 선택",
          enqueueUtterance: "맛집 찾아줘",
          slotId: slot,
        });
        break;
      case "route":
        out.push({
          id: "optimize_route",
          labelKo: "일정 최적화",
          enqueueUtterance: "동선 최적화해줘",
          slotId: slot,
        });
        break;
      case "transport":
        out.push({
          id: "search_transport",
          labelKo: "이동 수단",
          enqueueUtterance: "이동 동선 짜줘",
          slotId: slot,
        });
        break;
      case "dates":
        out.push({
          id: "set_dates",
          labelKo: "날짜 확정",
          enqueueUtterance: "4박5일로",
          slotId: slot,
        });
        break;
      case "destination":
        out.push({
          id: "set_destination",
          labelKo: "목적지 확정",
          enqueueUtterance: "목적지로 이어서",
          slotId: slot,
        });
        break;
      case "guests":
      case "budget":
        break;
      default:
        break;
    }
    if (out.length >= 3) break;
  }
  return out;
}

function resolveStatus(input: {
  readonly percent: number;
  readonly pending: readonly ContextWorkSlotId[];
  readonly inProgress: ContextWorkSlotId | null;
}): ContextWorkStatus {
  if (input.percent >= 100 || input.pending.length === 0) {
    return "awaiting_commit";
  }
  if (input.inProgress === "route") return "optimizing";
  if (input.percent <= 0) return "idle";
  return "building";
}

/**
 * Pure snapshot — Agent checks this before the next Action.
 */
export function buildContextWorkState(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
  readonly workstream?: WorkstreamState | null;
}): ContextWorkState {
  const contextEventId = input.contextEventId.trim();
  const ws =
    input.workstream ??
    (contextEventId ? readWorkstream(contextEventId) : null);
  const event =
    input.event ??
    (contextEventId ? findLifeEventCandidate(contextEventId) : null);
  const draft = contextEventId ? readContextWorkspace(contextEventId) : null;
  const completeness = computeContextCompleteness({
    contextEventId,
    event,
  });
  const slots = readLodgingBookingSlots(event);
  const segments = readTripStaySegments(event?.metadata ?? null);
  const period = expandTripPeriodFromSegments(segments);
  const kinds = new Set((ws?.events ?? []).map((e) => e.kind));

  const destinationOk = Boolean(
    (typeof event?.place === "string" && event.place.trim()) ||
      (typeof event?.metadata?.globePlaceLabel === "string" &&
        event.metadata.globePlaceLabel.trim()) ||
      (typeof event?.metadata?.travelDestination === "string" &&
        event.metadata.travelDestination.trim()) ||
      Boolean(draft?.realityDraft?.destinationKo?.trim()),
  );
  const datesOk = Boolean(
    period ||
      (slots.checkInIso && slots.checkOutIso) ||
      kinds.has("ScheduleUpdated") ||
      Boolean(draft?.realityDraft?.stayLabelKo?.trim()),
  );
  // Prefer in-memory workstream kinds so Agent snapshot works without storage.
  const lodgingOk =
    kinds.has("HotelCommitted") ||
    kinds.has("HotelSelected") ||
    completeness.gaps.find((g) => g.id === "lodging")?.filled === true;
  const flightOk =
    kinds.has("FlightCommitted") ||
    completeness.gaps.find((g) => g.id === "flight")?.filled === true;
  const foodOk =
    kinds.has("RestaurantAdded") ||
    completeness.gaps.find((g) => g.id === "food_pref")?.filled === true;
  const transportOk =
    kinds.has("RentalAdded") ||
    completeness.gaps.find((g) => g.id === "transport")?.filled === true;
  const guestsOk =
    completeness.gaps.find((g) => g.id === "guests")?.filled === true;
  const budgetOk =
    kinds.has("BudgetUpdated") ||
    completeness.gaps.find((g) => g.id === "budget")?.filled === true;
  const routeOk =
    lodgingOk &&
    (kinds.has("ScheduleUpdated") ||
      Boolean(event?.metadata?.tripContextStatus === "confirmed"));

  const filled: Record<ContextWorkSlotId, boolean> = {
    destination: destinationOk,
    dates: datesOk,
    lodging: lodgingOk,
    flight: flightOk,
    route: routeOk,
    food: foodOk,
    transport: transportOk,
    guests: guestsOk,
    budget: budgetOk,
  };

  const order: ContextWorkSlotId[] = [
    "destination",
    "dates",
    "lodging",
    "route",
    "flight",
    "food",
    "transport",
    "guests",
    "budget",
  ];
  const completed = order.filter((id) => filled[id]);
  const pending = order.filter((id) => !filled[id]);
  const inProgress = pending[0] ?? null;
  const nextActions = nextActionsForPending(pending);

  // Progress weights trip-critical slots higher.
  const critical: ContextWorkSlotId[] = [
    "destination",
    "dates",
    "lodging",
    "route",
    "flight",
    "food",
  ];
  const critFilled = critical.filter((id) => filled[id]).length;
  const percent = Math.round((critFilled / critical.length) * 100);

  return {
    contextEventId,
    title: ws?.title?.trim() || event?.title?.trim() || "Untitled",
    status: resolveStatus({ percent, pending, inProgress }),
    percent,
    completed,
    pending,
    inProgress,
    nextActions,
    updatedAtIso: new Date().toISOString(),
  };
}

export function syncContextWorkState(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
}): ContextWorkState {
  const contextEventId = input.contextEventId.trim();
  ensureWorkstream(contextEventId);
  const work = buildContextWorkState({
    contextEventId,
    event: input.event,
  });
  writeContextWorkState(work);
  return work;
}

const WORK_STATE_KEY = "rimvio.context-work-state.v1";

type WorkStateStore = Record<string, ContextWorkState>;

function readStore(): WorkStateStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(WORK_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as WorkStateStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: WorkStateStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WORK_STATE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function writeContextWorkState(state: ContextWorkState): ContextWorkState {
  const store = readStore();
  store[state.contextEventId] = state;
  writeStore(store);
  return state;
}

export function readContextWorkState(
  contextEventId: string,
): ContextWorkState | null {
  const id = contextEventId.trim();
  if (!id) return null;
  return readStore()[id] ?? null;
}

export function readOrBuildContextWorkState(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
}): ContextWorkState {
  const built = buildContextWorkState(input);
  writeContextWorkState(built);
  return built;
}

export function formatWorkSlotLabels(
  slots: readonly ContextWorkSlotId[],
): string[] {
  return slots.map((id) => CONTEXT_WORK_SLOT_LABEL_KO[id]);
}
