import type { InterpreterVisualization } from "@/lib/messy-prompt-interpreter/types";

/** Latest messy-input interpretation for the bound context agent frame. */

export type ContextAgentInterpretation = {
  readonly eventId: string;
  readonly originalMessage: string;
  readonly refinedMessage: string;
  readonly understandingKo: string;
  readonly visualization: InterpreterVisualization;
  readonly atIso: string;
};

export type ContextAgentInterpretationDetail = ContextAgentInterpretation | null;

const GLOBE_CONTEXT_AGENT_INTERPRETATION_EVENT =
  "rimvio-globe-context-agent-interpretation";

let latest: ContextAgentInterpretation | null = null;

function emit(next: ContextAgentInterpretation | null): void {
  latest = next;
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ContextAgentInterpretationDetail>(
      GLOBE_CONTEXT_AGENT_INTERPRETATION_EVENT,
      { detail: next },
    ),
  );
}

export function readContextAgentInterpretation(): ContextAgentInterpretation | null {
  return latest;
}

export function readContextAgentInterpretationForEvent(
  eventId: string,
): ContextAgentInterpretation | null {
  const id = eventId.trim();
  if (!id || latest?.eventId !== id) {
    return null;
  }
  return latest;
}

export function publishContextAgentInterpretation(
  detail: ContextAgentInterpretation,
): void {
  emit(detail);
}

export function clearContextAgentInterpretation(eventId?: string): void {
  if (!eventId || latest?.eventId === eventId.trim()) {
    emit(null);
  }
}

export function subscribeContextAgentInterpretation(
  listener: (detail: ContextAgentInterpretationDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<ContextAgentInterpretationDetail>).detail);
  };
  window.addEventListener(GLOBE_CONTEXT_AGENT_INTERPRETATION_EVENT, handler);
  return () =>
    window.removeEventListener(GLOBE_CONTEXT_AGENT_INTERPRETATION_EVENT, handler);
}
