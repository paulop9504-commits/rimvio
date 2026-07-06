import { readGlobeContextAgentSession } from "@/lib/globe/context-agent";

/** 맥락 어시스턴트 bound — one surface at a time until user dismisses with X. */
export function isGlobeContextAgentFocusLocked(): boolean {
  const session = readGlobeContextAgentSession();
  return session.phase === "bound" && Boolean(session.boundEventId?.trim());
}

export function readGlobeContextAgentBoundEventId(): string | null {
  const session = readGlobeContextAgentSession();
  if (session.phase !== "bound") {
    return null;
  }
  return session.boundEventId?.trim() || null;
}

export function shouldAutoLaunchBrainSurface(): boolean {
  return !isGlobeContextAgentFocusLocked();
}

export function shouldOpenGlobeBridgeSheet(): boolean {
  return !isGlobeContextAgentFocusLocked();
}

export function shouldOpenGlobeHubDetail(): boolean {
  return !isGlobeContextAgentFocusLocked();
}

/** Block switching to another context while agent is bound to one. */
export function isGlobeContextSwitchBlocked(targetEventId: string): boolean {
  const boundId = readGlobeContextAgentBoundEventId();
  const nextId = targetEventId.trim();
  if (!boundId || !nextId) {
    return false;
  }
  return boundId !== nextId;
}
