import type { SandboxEvent, SandboxSession } from "./types";

type StreamListener = (payload: { session: SandboxSession; event?: SandboxEvent }) => void;

const listeners = new Map<string, Set<StreamListener>>();

export function subscribeSandboxSession(
  sessionId: string,
  listener: StreamListener,
): () => void {
  const set = listeners.get(sessionId) ?? new Set<StreamListener>();
  set.add(listener);
  listeners.set(sessionId, set);
  return () => {
    const current = listeners.get(sessionId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      listeners.delete(sessionId);
    }
  };
}

export function publishSandboxUpdate(session: SandboxSession, event?: SandboxEvent): void {
  const set = listeners.get(session.sessionId);
  if (!set) return;
  for (const listener of set) {
    listener({ session, event });
  }
}

export function hasSandboxSubscribers(sessionId: string): boolean {
  return (listeners.get(sessionId)?.size ?? 0) > 0;
}
