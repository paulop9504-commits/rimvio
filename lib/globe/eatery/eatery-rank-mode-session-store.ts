/** Per-context eatery rank mode override (hub / feed chip tap). */

import type { EateryRankMode } from "@/lib/globe/eatery/eatery-rank-profile";

const EVENT_NAME = "rimvio-eatery-rank-mode-override";

const overrides = new Map<string, EateryRankMode>();

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

export function readEateryRankModeOverride(
  contextEventId: string,
): EateryRankMode | null {
  const id = contextEventId.trim();
  if (!id) {
    return null;
  }
  return overrides.get(id) ?? null;
}

export function resolveEateryRankMode(contextEventId: string): EateryRankMode {
  return readEateryRankModeOverride(contextEventId) ?? "auto";
}

export function writeEateryRankModeOverride(
  contextEventId: string,
  mode: EateryRankMode,
): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  overrides.set(id, mode);
  emit(id);
}

export function clearEateryRankModeOverride(contextEventId: string): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  overrides.delete(id);
  emit(id);
}

export function subscribeEateryRankModeOverride(
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
