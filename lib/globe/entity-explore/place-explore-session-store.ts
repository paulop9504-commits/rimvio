/**
 * Session SSOT — Place Action Graph open state (client-only).
 */

import type { PlaceExploreSessionV1 } from "@/lib/globe/entity-explore/types";

const EVENT_NAME = "rimvio-place-explore-session";

let current: PlaceExploreSessionV1 | null = null;

function emit(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function writePlaceExploreSession(session: PlaceExploreSessionV1): void {
  current = session;
  emit();
}

export function readPlaceExploreSession(): PlaceExploreSessionV1 | null {
  return current;
}

export function clearPlaceExploreSession(): void {
  if (!current) {
    return;
  }
  current = null;
  emit();
}

export function appendProjectedCandidateId(candidateId: string): void {
  if (!current) {
    return;
  }
  const id = candidateId.trim();
  if (!id || current.projectedCandidateIds.includes(id)) {
    return;
  }
  current = {
    ...current,
    projectedCandidateIds: [...current.projectedCandidateIds, id],
  };
  emit();
}

export function subscribePlaceExploreSession(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

export function resetPlaceExploreSessionForTests(): void {
  current = null;
}
