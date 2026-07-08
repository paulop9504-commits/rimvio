import type { DiscoveryLensSession } from "@/lib/globe/discovery-lens/types";

const SESSION_EVENT = "rimvio-discovery-lens-session";
const ACTION_EVENT = "rimvio-discovery-lens-action";

export type DiscoveryLensAction =
  | { readonly type: "activate"; readonly lensId: string; readonly rescout?: boolean }
  | {
      readonly type: "move_active";
      readonly lat: number;
      readonly lng: number;
      readonly rescout?: boolean;
    }
  | {
      readonly type: "resize_active";
      readonly radiusM: number;
      readonly rescout?: boolean;
    }
  | { readonly type: "clear" };

const sessions = new Map<string, DiscoveryLensSession>();

function emitSession(next: DiscoveryLensSession | null, contextEventId: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<DiscoveryLensSession | null>(SESSION_EVENT, {
      detail: next,
    }),
  );
  if (!next) {
    sessions.delete(contextEventId);
  }
}

export function readDiscoveryLensSession(
  contextEventId: string,
): DiscoveryLensSession | null {
  return sessions.get(contextEventId.trim()) ?? null;
}

export function publishDiscoveryLensSession(session: DiscoveryLensSession): void {
  const id = session.contextEventId.trim();
  sessions.set(id, session);
  emitSession(session, id);
}

export function clearDiscoveryLensSession(contextEventId: string): void {
  const id = contextEventId.trim();
  sessions.delete(id);
  emitSession(null, id);
}

export function subscribeDiscoveryLensSession(
  listener: (session: DiscoveryLensSession | null) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<DiscoveryLensSession | null>).detail);
  };
  window.addEventListener(SESSION_EVENT, handler);
  return () => window.removeEventListener(SESSION_EVENT, handler);
}

export function publishDiscoveryLensAction(
  contextEventId: string,
  action: DiscoveryLensAction,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<{ contextEventId: string; action: DiscoveryLensAction }>(
      ACTION_EVENT,
      { detail: { contextEventId: contextEventId.trim(), action } },
    ),
  );
}

export function subscribeDiscoveryLensAction(
  listener: (input: {
    contextEventId: string;
    action: DiscoveryLensAction;
  }) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener(
      (event as CustomEvent<{
        contextEventId: string;
        action: DiscoveryLensAction;
      }>).detail,
    );
  };
  window.addEventListener(ACTION_EVENT, handler);
  return () => window.removeEventListener(ACTION_EVENT, handler);
}
