/**
 * CalloutWindow store — session-scoped UI state.
 * Max 3 windows. Same entity re-open = focus. Evict oldest unlocked.
 */

import {
  CALLOUT_WINDOW_COMPACT_SIZE,
  CALLOUT_WINDOW_DEFAULT_SIZE,
  CALLOUT_WINDOW_MAX,
  CALLOUT_WINDOW_SCALE_MAX,
  CALLOUT_WINDOW_SCALE_MIN,
  type CalloutWindow,
  type CalloutWindowMode,
  type CalloutWindowPosition,
  type CalloutWindowSize,
} from "@/lib/callout/windows/types";

const byId = new Map<string, CalloutWindow>();
/** Oldest → newest open order (for eviction). */
const openOrder: string[] = [];
let focusedWindowId: string | null = null;
let zCounter = 10;
const listeners = new Set<() => void>();

/**
 * useSyncExternalStore requires getSnapshot to return the same reference
 * until the store mutates — allocating a fresh [] each call causes React #185.
 */
const EMPTY_WINDOWS: readonly CalloutWindow[] = Object.freeze([]);
let windowsSnapshot: readonly CalloutWindow[] = EMPTY_WINDOWS;

function recomputeWindowsSnapshot(): void {
  windowsSnapshot =
    openOrder.length === 0
      ? EMPTY_WINDOWS
      : openOrder
          .map((id) => byId.get(id))
          .filter((w): w is CalloutWindow => Boolean(w));
}

function emit(): void {
  recomputeWindowsSnapshot();
  for (const l of listeners) l();
}

function newId(entityId: string): string {
  return `callout_${Date.now().toString(36)}_${entityId.slice(0, 10)}`;
}

function clampScale(scale: number): number {
  return Math.min(
    CALLOUT_WINDOW_SCALE_MAX,
    Math.max(CALLOUT_WINDOW_SCALE_MIN, scale),
  );
}

function sizeForMode(mode: CalloutWindowMode): CalloutWindowSize {
  if (mode === "compact") return { ...CALLOUT_WINDOW_COMPACT_SIZE };
  if (mode === "workspace") {
    return { width: Math.min(420, 94 * 4), height: Math.min(640, 520) };
  }
  return { ...CALLOUT_WINDOW_DEFAULT_SIZE };
}

export function subscribeCalloutWindows(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCalloutWindowsSnapshot(): readonly CalloutWindow[] {
  return windowsSnapshot;
}

export function getFocusedCalloutWindowId(): string | null {
  return focusedWindowId;
}

export function readCalloutWindow(windowId: string): CalloutWindow | null {
  return byId.get(windowId.trim()) ?? null;
}

export function listActiveCalloutWindows(): readonly CalloutWindow[] {
  return getCalloutWindowsSnapshot();
}

export function findCalloutWindowByEntity(
  entityId: string,
): CalloutWindow | null {
  const id = entityId.trim();
  for (const w of getCalloutWindowsSnapshot()) {
    if (w.entityId === id) return w;
  }
  return null;
}

function evictOldestUnlocked(): void {
  while (openOrder.length >= CALLOUT_WINDOW_MAX) {
    const victimIdx = openOrder.findIndex((id) => {
      const w = byId.get(id);
      return w && !w.locked;
    });
    if (victimIdx < 0) {
      // All locked — drop oldest anyway
      const oldest = openOrder.shift();
      if (oldest) {
        byId.delete(oldest);
        if (focusedWindowId === oldest) focusedWindowId = null;
      }
      break;
    }
    const [victim] = openOrder.splice(victimIdx, 1);
    if (victim) {
      byId.delete(victim);
      if (focusedWindowId === victim) focusedWindowId = null;
    }
  }
}

/**
 * Open or focus CalloutWindow for an entity.
 * Does not mutate Reality Objects.
 */
export function openCalloutWindow(input: {
  readonly entityId: string;
  readonly seedPosition?: CalloutWindowPosition | null;
  readonly mode?: CalloutWindowMode;
  readonly locked?: boolean;
}): CalloutWindow {
  const entityId = input.entityId.trim();
  if (!entityId) {
    throw new Error("openCalloutWindow: entityId required");
  }

  const existing = findCalloutWindowByEntity(entityId);
  if (existing) {
    return focusCalloutWindow(existing.id) ?? existing;
  }

  evictOldestUnlocked();

  const now = new Date().toISOString();
  const mode = input.mode ?? "floating";
  const zIndex = ++zCounter;
  const window: CalloutWindow = {
    id: newId(entityId),
    entityId,
    mode,
    position: input.seedPosition ?? { x: 80 + openOrder.length * 28, y: 120 },
    size: sizeForMode(mode),
    scale: 1,
    zIndex,
    locked: input.locked === true,
    anchored: true,
    createdAtIso: now,
    updatedAtIso: now,
  };

  byId.set(window.id, window);
  openOrder.push(window.id);
  focusedWindowId = window.id;
  emit();
  return window;
}

export function focusCalloutWindow(windowId: string): CalloutWindow | null {
  const prev = byId.get(windowId.trim());
  if (!prev) return null;
  const next: CalloutWindow = {
    ...prev,
    zIndex: ++zCounter,
    updatedAtIso: new Date().toISOString(),
  };
  byId.set(next.id, next);
  focusedWindowId = next.id;
  emit();
  return next;
}

export function closeCalloutWindow(windowId: string): boolean {
  const id = windowId.trim();
  if (!byId.has(id)) return false;
  byId.delete(id);
  const idx = openOrder.indexOf(id);
  if (idx >= 0) openOrder.splice(idx, 1);
  if (focusedWindowId === id) {
    focusedWindowId = openOrder.length
      ? openOrder[openOrder.length - 1]!
      : null;
  }
  emit();
  return true;
}

export function updateCalloutWindowLayout(
  windowId: string,
  patch: {
    readonly position?: CalloutWindowPosition;
    readonly size?: Partial<CalloutWindowSize>;
    readonly scale?: number;
    readonly anchored?: boolean;
  },
): CalloutWindow | null {
  const prev = byId.get(windowId.trim());
  if (!prev) return null;
  const next: CalloutWindow = {
    ...prev,
    position: patch.position ?? prev.position,
    size: {
      width: patch.size?.width ?? prev.size.width,
      height: patch.size?.height ?? prev.size.height,
    },
    scale:
      patch.scale != null ? clampScale(patch.scale) : prev.scale,
    anchored: patch.anchored ?? prev.anchored,
    updatedAtIso: new Date().toISOString(),
  };
  byId.set(next.id, next);
  emit();
  return next;
}

export function setCalloutWindowMode(
  windowId: string,
  mode: CalloutWindowMode,
): CalloutWindow | null {
  const prev = byId.get(windowId.trim());
  if (!prev) return null;
  const next: CalloutWindow = {
    ...prev,
    mode,
    size: sizeForMode(mode),
    scale: mode === "compact" ? 1 : prev.scale,
    updatedAtIso: new Date().toISOString(),
  };
  byId.set(next.id, next);
  emit();
  return next;
}

/**
 * Agent entry — open multiple CalloutWindows (schema-ready).
 * Never Commits Reality.
 */
export function openCalloutWindowsFromAgent(
  entityIds: readonly string[],
): readonly CalloutWindow[] {
  const opened: CalloutWindow[] = [];
  for (const entityId of entityIds) {
    const id = entityId.trim();
    if (!id) continue;
    opened.push(
      openCalloutWindow({
        entityId: id,
        mode: "floating",
      }),
    );
  }
  return opened;
}

export function clearCalloutWindowsForTests(): void {
  if (byId.size === 0 && openOrder.length === 0 && focusedWindowId === null) {
    windowsSnapshot = EMPTY_WINDOWS;
    return;
  }
  byId.clear();
  openOrder.length = 0;
  focusedWindowId = null;
  zCounter = 10;
  emit();
}

/** Clear all Floating Callout Windows (Workspace collapse / unmount). */
export function clearAllCalloutWindows(): void {
  clearCalloutWindowsForTests();
}
