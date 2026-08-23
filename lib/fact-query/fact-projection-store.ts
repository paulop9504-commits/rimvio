import { publishAgentRuntimeEvent } from "@/lib/workstream/agent-runtime-bus";
import type { FactAnswerWire, FactProjectionState } from "@/lib/fact-query/types";
import { FACT_PROJECTION_EVENT } from "@/lib/fact-query/types";

let projection: FactProjectionState | null = null;

export function publishFactProjection(wire: FactAnswerWire): FactProjectionState {
  const next: FactProjectionState = {
    wire,
    publishedAtIso: new Date().toISOString(),
  };
  projection = next;

  publishAgentRuntimeEvent({
    kind: "ui_invalidate",
    contextEventId: `fact:${wire.queryId}`,
    labelKo: wire.headlineKo,
    payload: { factKind: wire.kind },
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(FACT_PROJECTION_EVENT, { detail: next }),
    );
  }
  return next;
}

export function readFactProjection(): FactProjectionState | null {
  return projection;
}

export function clearFactProjectionForTests(): void {
  projection = null;
}

export function subscribeFactProjection(
  listener: (state: FactProjectionState) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<FactProjectionState>).detail;
    if (detail?.wire) {
      listener(detail);
    }
  };
  window.addEventListener(FACT_PROJECTION_EVENT, handler);
  return () => window.removeEventListener(FACT_PROJECTION_EVENT, handler);
}
