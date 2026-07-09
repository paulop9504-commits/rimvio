/** Per-context exploration mode override (user chip tap). */

import type { ExplorationMode } from "@/lib/globe/discovery-policy/exploration-mode";

const EVENT_NAME = "rimvio-exploration-mode-override";

const overrides = new Map<string, ExplorationMode>();

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

export function readExplorationModeOverride(
  contextEventId: string,
): ExplorationMode | null {
  const id = contextEventId.trim();
  if (!id) {
    return null;
  }
  return overrides.get(id) ?? null;
}

export function writeExplorationModeOverride(
  contextEventId: string,
  mode: ExplorationMode,
): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  overrides.set(id, mode);
  emit(id);
}

export function clearExplorationModeOverride(contextEventId: string): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  overrides.delete(id);
  emit(id);
}

export function subscribeExplorationModeOverride(
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
