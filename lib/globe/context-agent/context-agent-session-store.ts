import type { LocalDiscoveryActionSpec } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { SpatialPatchPreview } from "@/lib/globe/context-condition-ai/spatial-patch-types";
import {
  transitionContextAgentWorkPhase,
  type ContextAgentWorkPhase,
} from "@/lib/globe/context-agent/context-agent-work-phase";

export type ContextAgentSessionState = {
  readonly eventId: string | null;
  readonly workPhase: ContextAgentWorkPhase;
  readonly activeSpec: LocalDiscoveryActionSpec | null;
  readonly patchPreview: SpatialPatchPreview | null;
};

export type ContextAgentSessionDetail = ContextAgentSessionState;

const GLOBE_CONTEXT_AGENT_SESSION_EVENT = "rimvio-globe-context-agent-session";

let session: ContextAgentSessionState = {
  eventId: null,
  workPhase: "idle",
  activeSpec: null,
  patchPreview: null,
};

function emit(next: ContextAgentSessionState): void {
  session = next;
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ContextAgentSessionDetail>(GLOBE_CONTEXT_AGENT_SESSION_EVENT, {
      detail: next,
    }),
  );
}

export function readContextAgentSessionState(): ContextAgentSessionState {
  return session;
}

export function resetContextAgentSession(): void {
  emit({
    eventId: null,
    workPhase: "idle",
    activeSpec: null,
    patchPreview: null,
  });
}

export function bindContextAgentSession(eventId: string): void {
  const id = eventId.trim();
  if (!id) {
    return;
  }
  emit({
    eventId: id,
    workPhase: "briefing",
    activeSpec: null,
    patchPreview: null,
  });
}

export function setContextAgentSessionPhase(
  workPhase: ContextAgentWorkPhase,
): void {
  emit({
    ...session,
    workPhase: transitionContextAgentWorkPhase(session.workPhase, workPhase),
  });
}

export function setContextAgentSessionSpec(
  activeSpec: LocalDiscoveryActionSpec | null,
): void {
  emit({ ...session, activeSpec });
}

export function setContextAgentSessionPatchPreview(
  patchPreview: SpatialPatchPreview | null,
): void {
  emit({ ...session, patchPreview });
}

export function subscribeContextAgentSession(
  listener: (detail: ContextAgentSessionDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<ContextAgentSessionDetail>).detail);
  };
  window.addEventListener(GLOBE_CONTEXT_AGENT_SESSION_EVENT, handler);
  return () =>
    window.removeEventListener(GLOBE_CONTEXT_AGENT_SESSION_EVENT, handler);
}
