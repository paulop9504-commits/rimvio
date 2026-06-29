import type { ContextRunState } from "@/lib/context-run/types";

const STORAGE_KEY = "rimvio.context-run.v1";

export const CONTEXT_RUN_STORAGE_KEY = STORAGE_KEY;

let activeRun: ContextRunState | null = null;

export function readActiveRunState(): ContextRunState | null {
  if (typeof window === "undefined") {
    return activeRun;
  }
  if (activeRun) {
    return activeRun;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    activeRun = JSON.parse(raw) as ContextRunState;
    return activeRun;
  } catch {
    return null;
  }
}

export function writeRunState(state: ContextRunState): void {
  activeRun = state;
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // session full — memory-only is fine
  }
}

export function ensureRunState(input: {
  graphId: string;
  goal: string;
  lastNode?: string | null;
}): ContextRunState {
  const state: ContextRunState = {
    graphId: input.graphId,
    goal: input.goal,
    status: "active",
    lastVisitedNode: input.lastNode ?? null,
    updatedAt: new Date().toISOString(),
  };
  writeRunState(state);
  return state;
}

export function clearRunState(): void {
  activeRun = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export function touchRunStateNode(lastVisitedNode: string): ContextRunState | null {
  const current = readActiveRunState();
  if (!current) {
    return null;
  }
  const next: ContextRunState = {
    ...current,
    lastVisitedNode,
    updatedAt: new Date().toISOString(),
  };
  writeRunState(next);
  return next;
}

export function completeRunState(): void {
  const current = readActiveRunState();
  if (!current) {
    return;
  }
  writeRunState({
    ...current,
    status: "completed",
    updatedAt: new Date().toISOString(),
  });
}
