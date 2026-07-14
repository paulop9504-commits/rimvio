/** Per-context lodging rank mode override (hub chip tap). */

import type { LodgingRankMode } from "@/lib/globe/lodging/lodging-rank-profile";

const EVENT_NAME = "rimvio-lodging-rank-mode-override";

const overrides = new Map<string, LodgingRankMode>();

function emit(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<{ contextEventId: string }>(EVENT_NAME, {
      detail: { contextEventId: contextEventId.trim() },
    }),
  );
}

export function readLodgingRankModeOverride(
  contextEventId: string,
): LodgingRankMode | null {
  const id = contextEventId.trim();
  if (!id) {
    return null;
  }
  return overrides.get(id) ?? null;
}

export function resolveLodgingRankMode(
  contextEventId: string,
): LodgingRankMode {
  return readLodgingRankModeOverride(contextEventId) ?? "auto";
}

export function writeLodgingRankModeOverride(
  contextEventId: string,
  mode: LodgingRankMode,
): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  overrides.set(id, mode);
  emit(id);
}

export function clearLodgingRankModeOverride(contextEventId: string): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  overrides.delete(id);
  emit(id);
}

export function subscribeLodgingRankModeOverride(
  listener: (contextEventId: string) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ contextEventId: string }>).detail;
    if (detail?.contextEventId) {
      listener(detail.contextEventId);
    }
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
