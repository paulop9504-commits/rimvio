"use client";

const STORAGE_PREFIX = "rimvio-bridge-sync-cursor:";

export function bridgeSyncCursorStorageKey(eventId: string): string {
  return `${STORAGE_PREFIX}${eventId.trim()}`;
}

export function readBridgeSyncCursor(eventId: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(bridgeSyncCursorStorageKey(eventId));
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

export function writeBridgeSyncCursor(eventId: string, iso: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const value = iso.trim();
  if (!value) {
    return;
  }
  try {
    localStorage.setItem(bridgeSyncCursorStorageKey(eventId), value);
  } catch {
    /* quota */
  }
}

export function maxIsoTimestamp(left: string | null | undefined, right: string | null | undefined): string | null {
  const a = left?.trim();
  const b = right?.trim();
  if (!a) {
    return b ?? null;
  }
  if (!b) {
    return a;
  }
  return Date.parse(a) >= Date.parse(b) ? a : b;
}
