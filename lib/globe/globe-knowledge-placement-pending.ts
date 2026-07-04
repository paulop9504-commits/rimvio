"use client";

import type { KnowledgePlacementSuggestion } from "@/lib/situation-projection/promote-projection-link";

const STORAGE_KEY = "rimvio-globe-knowledge-placement-pending";

export type GlobeKnowledgePlacementPending = {
  suggestion: KnowledgePlacementSuggestion;
  captureEventId: string;
  captureFragmentId: string;
  captureFileName?: string | null;
  pillId?: string | null;
};

let memoryPending: GlobeKnowledgePlacementPending | null = null;

export function stashGlobeKnowledgePlacementPending(
  pending: GlobeKnowledgePlacementPending,
): void {
  memoryPending = pending;
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // Session storage may be unavailable — memory fallback only.
  }
}

export function readGlobeKnowledgePlacementPending(): GlobeKnowledgePlacementPending | null {
  if (memoryPending) {
    return memoryPending;
  }
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as GlobeKnowledgePlacementPending;
    if (!parsed?.suggestion?.anchorEventId || !parsed.captureEventId) {
      return null;
    }
    memoryPending = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function clearGlobeKnowledgePlacementPending(): void {
  memoryPending = null;
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
