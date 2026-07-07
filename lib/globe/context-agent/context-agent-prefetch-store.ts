import type { WeatherContext } from "@/lib/context-resolver/types";

export type ContextAgentPrefetchSnapshot = {
  readonly eventId: string;
  readonly weather: WeatherContext | null;
  readonly lodgingReady: boolean;
  readonly eateryReady: boolean;
  readonly atIso: string;
};

const GLOBE_CONTEXT_AGENT_PREFETCH_EVENT = "rimvio-globe-context-agent-prefetch";

const cache = new Map<string, ContextAgentPrefetchSnapshot>();

function emit(eventId: string, snapshot: ContextAgentPrefetchSnapshot): void {
  cache.set(eventId, snapshot);
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ContextAgentPrefetchSnapshot>(GLOBE_CONTEXT_AGENT_PREFETCH_EVENT, {
      detail: snapshot,
    }),
  );
}

export function readContextAgentPrefetch(
  eventId: string,
): ContextAgentPrefetchSnapshot | null {
  const id = eventId.trim();
  if (!id) {
    return null;
  }
  return cache.get(id) ?? null;
}

export function publishContextAgentPrefetch(
  snapshot: ContextAgentPrefetchSnapshot,
): void {
  emit(snapshot.eventId.trim(), snapshot);
}

export function subscribeContextAgentPrefetch(
  listener: (snapshot: ContextAgentPrefetchSnapshot) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<ContextAgentPrefetchSnapshot>).detail);
  };
  window.addEventListener(GLOBE_CONTEXT_AGENT_PREFETCH_EVENT, handler);
  return () =>
    window.removeEventListener(GLOBE_CONTEXT_AGENT_PREFETCH_EVENT, handler);
}
