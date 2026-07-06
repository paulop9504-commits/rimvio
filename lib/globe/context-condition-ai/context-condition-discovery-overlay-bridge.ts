import type { ContextConditionDiscoveryOverlay } from "@/lib/globe/context-condition-ai/context-condition-discovery-overlay-types";

const EVENT_NAME = "rimvio-context-condition-discovery-overlay";

let overlay: ContextConditionDiscoveryOverlay | null = null;

function emit(next: ContextConditionDiscoveryOverlay | null) {
  overlay = next;
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ContextConditionDiscoveryOverlay | null>(EVENT_NAME, {
      detail: next,
    }),
  );
}

export function readContextConditionDiscoveryOverlay(): ContextConditionDiscoveryOverlay | null {
  return overlay;
}

export function publishContextConditionDiscoveryOverlay(
  next: ContextConditionDiscoveryOverlay,
): void {
  emit(next);
}

export function clearContextConditionDiscoveryOverlay(contextEventId?: string): void {
  if (!contextEventId?.trim()) {
    emit(null);
    return;
  }
  if (overlay?.contextEventId === contextEventId.trim()) {
    emit(null);
  }
}

export function subscribeContextConditionDiscoveryOverlay(
  listener: (detail: ContextConditionDiscoveryOverlay | null) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener(
      (event as CustomEvent<ContextConditionDiscoveryOverlay | null>).detail,
    );
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
