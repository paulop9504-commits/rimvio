"use client";

import { hasActiveCalendarStudyFocus } from "@/lib/globe/market/coordination/read-user-focus-defer";
import { getRecentKnowledgeEntities } from "@/lib/knowledge/knowledge-entity-db";
import { FIXED_CALENDAR_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";

/** Must match `FOCUS_SESSION_STORAGE_KEY` in action-chat focus-session-store. */
const FOCUS_SESSION_STORAGE_KEY = "rimvio.focus-session.v1";

function isFocusSessionRunning(now = Date.now()): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const raw = window.sessionStorage.getItem(FOCUS_SESSION_STORAGE_KEY);
    if (!raw) {
      return false;
    }
    const session = JSON.parse(raw) as { status?: string; endsAt?: string };
    if (!session?.status || session.status !== "running") {
      return false;
    }
    const endsAtMs = new Date(session.endsAt ?? "").getTime();
    return Number.isFinite(endsAtMs) && endsAtMs > now;
  } catch {
    return false;
  }
}

let cachedStudyFocusActive = false;
let cacheAtMs = 0;
const CACHE_TTL_MS = 15_000;

export function readUserFocusDeferringNegotiationSync(): boolean {
  if (isFocusSessionRunning()) {
    return true;
  }
  if (Date.now() - cacheAtMs < CACHE_TTL_MS) {
    return cachedStudyFocusActive;
  }
  return cachedStudyFocusActive;
}

export async function refreshUserFocusDeferringNegotiation(
  now = new Date(),
): Promise<boolean> {
  if (isFocusSessionRunning()) {
    cachedStudyFocusActive = true;
    cacheAtMs = Date.now();
    return true;
  }
  const entities = await getRecentKnowledgeEntities({
    containerId: FIXED_CALENDAR_CONTAINER_ID,
    limit: 40,
  });
  cachedStudyFocusActive = hasActiveCalendarStudyFocus(entities, now);
  cacheAtMs = Date.now();
  return cachedStudyFocusActive;
}
