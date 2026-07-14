"use client";

export type DiscoveryFeedScrollIntent = "explore_more" | "reject_candidates";

export type DiscoveryFeedScrollSignal = {
  contextEventId: string;
  resourceId: string;
  placeId: string;
  kind: string;
  intent: DiscoveryFeedScrollIntent;
  dwellMs: number;
  atIso: string;
};

const STORAGE_PREFIX = "rimvio.discovery-feed-scroll.";

function storageKey(contextEventId: string): string {
  return `${STORAGE_PREFIX}${contextEventId.trim()}`;
}

/** Fast flick past cards → reject; longer glance → still exploring. */
export function inferDiscoveryFeedScrollIntent(input: {
  dwellMs: number;
  pinned: boolean;
}): DiscoveryFeedScrollIntent {
  if (input.pinned) {
    return "explore_more";
  }
  if (input.dwellMs < 900) {
    return "reject_candidates";
  }
  return "explore_more";
}

export function recordDiscoveryFeedScrollSignal(signal: DiscoveryFeedScrollSignal): void {
  if (typeof window === "undefined") {
    return;
  }
  const key = storageKey(signal.contextEventId);
  if (!key.trim()) {
    return;
  }
  try {
    const raw = sessionStorage.getItem(key);
    const prior = raw ? (JSON.parse(raw) as DiscoveryFeedScrollSignal[]) : [];
    const next = [...prior, signal].slice(-40);
    sessionStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore quota
  }
}

export function readDiscoveryFeedScrollSignals(
  contextEventId: string,
): readonly DiscoveryFeedScrollSignal[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = sessionStorage.getItem(storageKey(contextEventId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as DiscoveryFeedScrollSignal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function countDiscoveryFeedRejectSignals(
  contextEventId: string,
): number {
  return readDiscoveryFeedScrollSignals(contextEventId).filter(
    (row) => row.intent === "reject_candidates",
  ).length;
}
