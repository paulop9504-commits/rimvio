/**
 * Context Bloom → Execution — prepare only, never Commit.
 * Appears after bloom phase reaches execution_ready.
 */

import {
  capabilitiesForDiscoveryCard,
  gatePlaceInfoActionsByCapabilities,
  type PlaceInfoActionHandlers,
} from "@/lib/reality-object";
import { enqueuePlacePrepToExecutionInbox } from "@/lib/reality-queue/enqueue-place-prep-operation";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";
import type { ContextBloomCandidate } from "@/lib/visual-projection/context-bloom-types";
import {
  isContextBloomExecutionReady,
  readContextBloomSession,
} from "@/lib/visual-projection/context-bloom-store";

const RESOURCE_KIND_MARKERS = [
  ":lodging:",
  ":eatery:",
  ":activity:",
  ":amenity:",
] as const;

export function resolveContextEventIdFromResourceId(
  resourceId: string | null | undefined,
): string | null {
  const id = resourceId?.trim();
  if (!id) {
    return null;
  }
  for (const marker of RESOURCE_KIND_MARKERS) {
    const index = id.lastIndexOf(marker);
    if (index > 0) {
      return id.slice(0, index).trim() || null;
    }
  }
  return null;
}

export function bloomCandidatePlaceKind(
  candidate: ContextBloomCandidate,
): "eatery" | "lodging" | "activity" {
  if (candidate.pinKind === "lodging") {
    return "lodging";
  }
  if (candidate.pinKind === "activity") {
    return "activity";
  }
  return "eatery";
}

export function capabilitiesForBloomCandidate(
  candidate: ContextBloomCandidate,
) {
  return capabilitiesForDiscoveryCard({
    kind: candidate.pinKind,
    title: candidate.label,
  });
}

/** True when bloom session is ready to show Execution CTAs. */
export function shouldShowContextBloomExecutionStrip(): boolean {
  return isContextBloomExecutionReady() && Boolean(readContextBloomSession());
}

export function gateBloomExecutionHandlers(input: {
  candidate: ContextBloomCandidate;
  handlers: PlaceInfoActionHandlers;
}): PlaceInfoActionHandlers {
  return gatePlaceInfoActionsByCapabilities({
    capabilities: capabilitiesForBloomCandidate(input.candidate),
    handlers: input.handlers,
  });
}

export type ContextBloomInboxResult =
  | { ok: true; eventId: string; operation: RealityOperationV1 }
  | { ok: false; reason: "no_context" | "not_ready" };

/**
 * Add selected bloom object to Execution Inbox (prep only).
 */
export function runContextBloomAddToInbox(input: {
  candidate: ContextBloomCandidate;
  fallbackContextEventId?: string | null;
  reasonLinesKo?: readonly string[] | null;
}): ContextBloomInboxResult {
  if (!isContextBloomExecutionReady()) {
    return { ok: false, reason: "not_ready" };
  }
  const eventId =
    resolveContextEventIdFromResourceId(input.candidate.resourceId) ??
    input.fallbackContextEventId?.trim() ??
    "";
  if (!eventId) {
    return { ok: false, reason: "no_context" };
  }

  const kind = bloomCandidatePlaceKind(input.candidate);
  const placeId =
    input.candidate.placeId?.trim() ||
    input.candidate.resourceId.trim() ||
    input.candidate.id;

  const operation = enqueuePlacePrepToExecutionInbox({
    contextEventId: eventId,
    placeId,
    placeName: input.candidate.label,
    kind,
    partySize: 2,
    reasonLinesKo: input.reasonLinesKo ?? ["맥락에서 선택"],
    lat: input.candidate.lat,
    lng: input.candidate.lng,
  });

  return { ok: true, eventId, operation };
}

export function openBloomDirectionsUrl(candidate: ContextBloomCandidate): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${candidate.lat},${candidate.lng}`;
}
