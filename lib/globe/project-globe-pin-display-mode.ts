import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { scoreSpacetimeFit, haversineKm, parseIsoMs } from "@/lib/feed/spacetime-fit";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

const RECENT_MS = 14 * 24 * 60 * 60 * 1000;
const NEAR_KM = 120;

function readEventStartMs(event: EventCandidate): number {
  const plan = readPlanContextFromEvent(event);
  return (
    parseIsoMs(plan?.windowStartIso) ??
    parseIsoMs(event.datetime) ??
    parseIsoMs(event.updatedAt) ??
    0
  );
}

function isRelevantLifecycle(lifecycle: EventCandidate["lifecycle"]): boolean {
  return (
    lifecycle === "active" ||
    lifecycle === "scheduled" ||
    lifecycle === "confirmed" ||
    lifecycle === "candidate"
  );
}

function shouldRenderPinAsSlot(input: {
  pin: ClassifiedGlobePin;
  event: EventCandidate | null;
  focusedEventId: string | null;
  expandedPinId: string | null;
  lodgingFocusStageOpen: boolean;
  viewerLat: number | null;
  viewerLng: number | null;
  nowMs: number;
}): boolean {
  const { pin } = input;

  if (pin.pinShape === "viewer" || pin.pinShape === "cluster") {
    return true;
  }

  if (pin.id === input.expandedPinId) {
    return true;
  }

  const eventId = pin.sourceEventId?.trim() ?? "";
  if (input.lodgingFocusStageOpen && eventId && eventId === input.focusedEventId) {
    return false;
  }

  if (input.lodgingFocusStageOpen) {
    return false;
  }

  if (pin.hubFocusMuted) {
    return false;
  }

  if (eventId && eventId === input.focusedEventId) {
    return true;
  }

  if (pin.emphasis === "primary" && pin.tripLeg === "destination") {
    return true;
  }

  const event = input.event;
  if (!event) {
    return false;
  }

  if (!isRelevantLifecycle(event.lifecycle)) {
    return false;
  }

  const startMs = readEventStartMs(event);
  if (startMs > 0 && input.nowMs - startMs > RECENT_MS && eventId !== input.focusedEventId) {
    const endMs = parseIsoMs(readPlanContextFromEvent(event)?.windowEndIso);
    if (endMs != null && endMs < input.nowMs) {
      return false;
    }
    if (event.lifecycle === "completed" || event.lifecycle === "archived") {
      return false;
    }
  }

  if (input.viewerLat != null && input.viewerLng != null) {
    const fit = scoreSpacetimeFit({
      capturedAtIso: new Date(input.nowMs).toISOString(),
      lat: input.viewerLat,
      lng: input.viewerLng,
      eventStartIso: event.datetime ?? null,
      eventEndIso: readPlanContextFromEvent(event)?.windowEndIso ?? null,
      eventPlace: event.place,
      eventLat: pin.lat,
      eventLng: pin.lng,
      capturedPlaceLabel: null,
    });
    if (fit.placeOk || haversineKm(input.viewerLat, input.viewerLng, pin.lat, pin.lng) <= NEAR_KM) {
      if (isRelevantLifecycle(event.lifecycle)) {
        return true;
      }
    }
  }

  if (isRelevantLifecycle(event.lifecycle) && startMs > input.nowMs - RECENT_MS) {
    return true;
  }

  return false;
}

/** Collapse stale / unrelated context pins to dots — tap expands to slot card. */
export function projectGlobePinDisplayMode(input: {
  pins: readonly ClassifiedGlobePin[];
  eventsById: ReadonlyMap<string, EventCandidate>;
  focusedEventId?: string | null;
  expandedPinId?: string | null;
  lodgingFocusStageOpen?: boolean;
  viewerLat?: number | null;
  viewerLng?: number | null;
  now?: Date;
}): ClassifiedGlobePin[] {
  const focusedEventId = input.focusedEventId?.trim() || null;
  const expandedPinId = input.expandedPinId?.trim() || null;
  const lodgingFocusStageOpen = input.lodgingFocusStageOpen === true;
  const viewerLat = input.viewerLat ?? null;
  const viewerLng = input.viewerLng ?? null;
  const nowMs = (input.now ?? new Date()).getTime();

  return input.pins.map((pin) => {
    if (pin.pinShape === "viewer" || pin.pinShape === "cluster") {
      return pin;
    }

    const eventId = pin.sourceEventId?.trim() ?? "";
    const event = eventId ? input.eventsById.get(eventId) ?? null : null;
    const asSlot = shouldRenderPinAsSlot({
      pin,
      event,
      focusedEventId,
      expandedPinId,
      lodgingFocusStageOpen,
      viewerLat,
      viewerLng,
      nowMs,
    });

    if (asSlot) {
      if (pin.pinShape === "slot" && pin.slot) {
        return pin;
      }
      return {
        ...pin,
        pinShape: "slot" as const,
        slot: pin.slot ?? {
          experienceTitle: pin.label,
          photoCount: 0,
          videoCount: 0,
        },
      };
    }

    return {
      ...pin,
      pinShape: "dot" as const,
      slot: undefined,
    };
  });
}
