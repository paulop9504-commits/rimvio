import { dispatchExecutionFeedGoal } from "@/lib/context-run/execution-feed-bridge";
import { ensureRunState, readActiveRunState } from "@/lib/context-run/run-state-store";
import { readPortalComposeRunState } from "@/lib/portal/portal-compose-run-store";

const STORAGE_KEY = "rimvio.globe-chat.graph-id.v1";

/** Active fullscreen chat thread id — stable across turns in one session. */
export function readGlobeChatGraphId(): string | null {
  const portal = readPortalComposeRunState()?.graphId?.trim();
  if (portal) {
    return portal;
  }
  const active = readActiveRunState()?.graphId?.trim();
  if (active) {
    return active;
  }
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return sessionStorage.getItem(STORAGE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function ensureGlobeChatGraphId(): string {
  const existing = readGlobeChatGraphId();
  if (existing) {
    ensureRunState({
      graphId: existing,
      goal: readActiveRunState()?.goal?.trim() || readPortalComposeRunState()?.composeSeed?.trim() || "",
    });
    return existing;
  }

  const graphId = `composer:ambient:${Date.now().toString(36)}`;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(STORAGE_KEY, graphId);
    } catch {
      // session full — memory-only run state still works
    }
  }
  ensureRunState({ graphId, goal: "" });
  return graphId;
}

export function bindGlobeChatGraphId(goalKo: string): string {
  const graphId = ensureGlobeChatGraphId();
  ensureRunState({ graphId, goal: goalKo.trim() || readActiveRunState()?.goal || "" });
  if (goalKo.trim()) {
    dispatchExecutionFeedGoal({ graphId, goalKo: goalKo.trim() });
  }
  return graphId;
}
