import type { ContextActionInjection } from "@/lib/globe/context-action-injection/types";

export type ContextActionInjectionDetail = ContextActionInjection | null;

const GLOBE_CONTEXT_ACTION_INJECTION_EVENT =
  "rimvio-globe-context-action-injection";

let active: ContextActionInjection | null = null;

function emit(next: ContextActionInjection | null): void {
  active = next;
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ContextActionInjectionDetail>(
      GLOBE_CONTEXT_ACTION_INJECTION_EVENT,
      { detail: next },
    ),
  );
}

export function readContextActionInjection(): ContextActionInjection | null {
  return active;
}

export function publishContextActionInjection(
  injection: ContextActionInjection,
): void {
  emit(injection);
}

export function clearContextActionInjection(): void {
  emit(null);
}

export function subscribeContextActionInjection(
  listener: (detail: ContextActionInjectionDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<ContextActionInjectionDetail>).detail);
  };
  window.addEventListener(GLOBE_CONTEXT_ACTION_INJECTION_EVENT, handler);
  return () =>
    window.removeEventListener(GLOBE_CONTEXT_ACTION_INJECTION_EVENT, handler);
}
