/**
 * Active Context Resolver
 *
 * Every user input first lands here. Instead of treating each turn as
 * a fresh chat, we find the currently running Context and route into it.
 *
 * Like Cursor always knows "current workspace", Rimvio always knows
 * "current Context".
 */

export type ActiveContextState = "running" | "paused" | "completed";

export type ActiveContext = {
  readonly contextId: string;
  readonly label: string;
  readonly domain: string;
  readonly state: ActiveContextState;
  readonly slots: Readonly<Record<string, unknown>>;
  readonly lockedAt: string;
};

const SESSION_KEY = "rimvio-active-context";

let activeContext: ActiveContext | null = null;

export function lockContext(ctx: ActiveContext): void {
  activeContext = ctx;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(ctx));
  }
}

export function unlockContext(): void {
  activeContext = null;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export function getActiveContext(): ActiveContext | null {
  if (activeContext) return activeContext;
  if (typeof sessionStorage !== "undefined") {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        activeContext = JSON.parse(raw) as ActiveContext;
        return activeContext;
      } catch { /* corrupted */ }
    }
  }
  return null;
}

export function isContextLocked(): boolean {
  return getActiveContext() !== null;
}

export function updateActiveSlots(
  patches: Readonly<Record<string, unknown>>,
): ActiveContext | null {
  const ctx = getActiveContext();
  if (!ctx) return null;
  const updated: ActiveContext = {
    ...ctx,
    slots: { ...ctx.slots, ...patches },
  };
  lockContext(updated);
  return updated;
}
