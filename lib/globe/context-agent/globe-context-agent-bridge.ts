import {
  bindContextAgentSession,
  resetContextAgentSession,
} from "@/lib/globe/context-agent/context-agent-session-store";
import { clearContextActionInjection } from "@/lib/globe/context-action-injection";
import { clearContextAgentComposeThread } from "@/lib/globe/assistant";

export type GlobeContextAgentPhase = "idle" | "arming" | "bound";

export type GlobeContextAgentDetail = {
  phase: GlobeContextAgentPhase;
  boundEventId: string | null;
};

const GLOBE_CONTEXT_AGENT_EVENT = "rimvio-globe-context-agent";

let session: GlobeContextAgentDetail = {
  phase: "idle",
  boundEventId: null,
};

function emit(next: GlobeContextAgentDetail) {
  session = next;
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeContextAgentDetail>(GLOBE_CONTEXT_AGENT_EVENT, {
      detail: next,
    }),
  );
}

export function readGlobeContextAgentSession(): GlobeContextAgentDetail {
  return session;
}

export function isGlobeContextAgentArming(): boolean {
  return session.phase === "arming";
}

export function isGlobeContextAgentBound(eventId?: string | null): boolean {
  if (session.phase !== "bound" || !session.boundEventId) {
    return false;
  }
  if (!eventId?.trim()) {
    return true;
  }
  return session.boundEventId === eventId.trim();
}

export function armGlobeContextAgent(): void {
  emit({ phase: "arming", boundEventId: null });
}

export function cancelGlobeContextAgentArm(): void {
  emit({ phase: "idle", boundEventId: null });
}

export function bindGlobeContextAgent(eventId: string): void {
  const id = eventId.trim();
  if (!id) {
    return;
  }
  emit({ phase: "bound", boundEventId: id });
  bindContextAgentSession(id);
}

export function clearGlobeContextAgent(): void {
  const boundId = session.boundEventId;
  emit({ phase: "idle", boundEventId: null });
  resetContextAgentSession();
  clearContextActionInjection();
  if (boundId) {
    clearContextAgentComposeThread(boundId);
  }
}

export function subscribeGlobeContextAgent(
  listener: (detail: GlobeContextAgentDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<GlobeContextAgentDetail>).detail);
  };
  window.addEventListener(GLOBE_CONTEXT_AGENT_EVENT, handler);
  return () => window.removeEventListener(GLOBE_CONTEXT_AGENT_EVENT, handler);
}
