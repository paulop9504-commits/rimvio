"use client";

const BRIDGE_SYNC_SESSION_EVENT = "rimvio-bridge-sync-session";

export type BridgeSyncPhase = "idle" | "uploading" | "syncing" | "error";

type BridgeSyncEntry = {
  phase: BridgeSyncPhase;
  updatedAtIso: string;
  message?: string;
};

const entries = new Map<string, BridgeSyncEntry>();

function notifyBridgeSyncSession(eventId?: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(BRIDGE_SYNC_SESSION_EVENT, {
      detail: { eventId: eventId?.trim() || null },
    }),
  );
}

export function readBridgeSyncPhase(eventId: string): BridgeSyncPhase {
  return entries.get(eventId.trim())?.phase ?? "idle";
}

export function setBridgeSyncPhase(input: {
  eventId: string;
  phase: BridgeSyncPhase;
  message?: string;
}): void {
  const key = input.eventId.trim();
  if (!key) {
    return;
  }
  if (input.phase === "idle") {
    entries.delete(key);
  } else {
    entries.set(key, {
      phase: input.phase,
      updatedAtIso: new Date().toISOString(),
      message: input.message?.trim() || undefined,
    });
  }
  notifyBridgeSyncSession(key);
}

export function subscribeBridgeSyncSession(
  listener: (eventId: string | null) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ eventId?: string | null }>).detail;
    listener(detail?.eventId ?? null);
  };
  window.addEventListener(BRIDGE_SYNC_SESSION_EVENT, handler);
  return () => window.removeEventListener(BRIDGE_SYNC_SESSION_EVENT, handler);
}
