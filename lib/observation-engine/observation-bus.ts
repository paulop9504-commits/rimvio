/**
 * Observation bus — subscribe, emit, and handle reality change observations.
 */

import type { Observation, ObservationHandler, ObservationKind } from "@/lib/observation-engine/types";

const handlers: Map<ObservationKind | "*", ObservationHandler[]> = new Map();
const recentObservations: Observation[] = [];
const MAX_RECENT = 50;

export function onObservation(kind: ObservationKind | "*", handler: ObservationHandler): () => void {
  const list = handlers.get(kind) ?? [];
  list.push(handler);
  handlers.set(kind, list);
  return () => {
    const updated = (handlers.get(kind) ?? []).filter((h) => h !== handler);
    handlers.set(kind, updated);
  };
}

export function emitObservation(observation: Observation): void {
  recentObservations.push(observation);
  if (recentObservations.length > MAX_RECENT) recentObservations.shift();

  const specific = handlers.get(observation.kind) ?? [];
  const wildcard = handlers.get("*") ?? [];
  for (const h of [...specific, ...wildcard]) {
    try {
      h(observation);
    } catch {
      // handler errors don't block emission
    }
  }
}

export function getRecentObservations(contextId?: string): readonly Observation[] {
  if (!contextId) return recentObservations;
  return recentObservations.filter((o) => o.contextId === contextId);
}

export function getPendingReplans(contextId?: string): readonly Observation[] {
  return getRecentObservations(contextId).filter((o) => o.requiresReplan);
}
