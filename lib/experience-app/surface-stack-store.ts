/**
 * Surface Stack + Application Session Context — Chat 닫아도 상태 유지.
 */

import type {
  ApplicationSessionContext,
  CartLine,
  ExperienceSurfaceId,
  SurfaceFrame,
} from "@/lib/experience-app/surface-types";
import type { ExperienceAppRole, StoreRecord } from "@/lib/experience-app/types";
import { DEMO_STORES } from "@/lib/experience-app/seed";
import { readExperienceRole } from "@/lib/experience-app/role-store";

const STACK_KEY = "rimvio.experience-app.surface-stack.v1";
const CONTEXT_KEY = "rimvio.experience-app.session-context.v1";

let stackMemory: SurfaceFrame[] = [];
let contextMemory: ApplicationSessionContext | null = null;

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function defaultContext(): ApplicationSessionContext {
  return {
    sessionId: `sess-${Date.now().toString(36)}`,
    appId: "local-delivery",
    role: readExperienceRole(),
    stores: DEMO_STORES,
    cartItems: [],
  };
}

function persist(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STACK_KEY, JSON.stringify(stackMemory));
    if (contextMemory) {
      window.localStorage.setItem(CONTEXT_KEY, JSON.stringify(contextMemory));
    }
    window.dispatchEvent(new CustomEvent("rimvio:experience-surface-stack"));
  } catch {
    /* quota */
  }
}

function readStackRaw(): SurfaceFrame[] {
  if (!canUseStorage()) return stackMemory;
  try {
    const raw = window.localStorage.getItem(STACK_KEY);
    if (!raw) return stackMemory;
    stackMemory = JSON.parse(raw) as SurfaceFrame[];
    return stackMemory;
  } catch {
    return stackMemory;
  }
}

export function readSessionContext(): ApplicationSessionContext {
  if (!canUseStorage()) return contextMemory ?? defaultContext();
  try {
    const raw = window.localStorage.getItem(CONTEXT_KEY);
    if (!raw) {
      contextMemory = defaultContext();
      return contextMemory;
    }
    contextMemory = JSON.parse(raw) as ApplicationSessionContext;
    return contextMemory;
  } catch {
    return contextMemory ?? defaultContext();
  }
}

export function patchSessionContext(
  patch: Partial<Omit<ApplicationSessionContext, "sessionId" | "appId">> & {
    readonly sessionId?: string;
    readonly appId?: string;
  },
): ApplicationSessionContext {
  const prev = readSessionContext();
  contextMemory = {
    ...prev,
    ...patch,
    cartItems: patch.cartItems ?? prev.cartItems,
    stores: patch.stores ?? prev.stores,
  };
  persist();
  return contextMemory;
}

export function readSurfaceStack(): readonly SurfaceFrame[] {
  return [...readStackRaw()];
}

export function readTopSurface(): SurfaceFrame | null {
  const stack = readStackRaw();
  return stack[stack.length - 1] ?? null;
}

export function pushSurface(
  surface: ExperienceSurfaceId,
  context: Record<string, unknown> = {},
  previousSurface?: ExperienceSurfaceId,
): SurfaceFrame {
  const frame: SurfaceFrame = { surface, context, previousSurface };
  stackMemory = [...readStackRaw(), frame];
  persist();
  return frame;
}

export function popSurface(): SurfaceFrame | null {
  const stack = readStackRaw();
  if (stack.length === 0) return null;
  const removed = stack[stack.length - 1]!;
  stackMemory = stack.slice(0, -1);
  persist();
  return removed;
}

export function closeSurfaceStack(): void {
  stackMemory = [];
  persist();
}

export function replaceSurfaceStack(frames: readonly SurfaceFrame[]): void {
  stackMemory = [...frames];
  persist();
}

export function setCartItems(items: readonly CartLine[]): void {
  patchSessionContext({ cartItems: items });
}

export function setSessionStores(stores: readonly StoreRecord[]): void {
  patchSessionContext({ stores });
}

export function setSessionRole(role: ExperienceAppRole): void {
  patchSessionContext({ role });
}

export function subscribeSurfaceStack(listener: () => void): () => void {
  if (!canUseStorage()) return () => {};
  window.addEventListener("rimvio:experience-surface-stack", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("rimvio:experience-surface-stack", listener);
    window.removeEventListener("storage", listener);
  };
}

export function resetSurfaceStackSession(): void {
  stackMemory = [];
  contextMemory = defaultContext();
  if (canUseStorage()) {
    window.localStorage.removeItem(STACK_KEY);
    window.localStorage.setItem(CONTEXT_KEY, JSON.stringify(contextMemory));
  }
}
