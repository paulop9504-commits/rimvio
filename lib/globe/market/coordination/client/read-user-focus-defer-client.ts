"use client";

import { isFocusSessionRunning } from "@/lib/action-chat/mention-focus/focus-session-store";
import { hasActiveCalendarStudyFocus } from "@/lib/globe/market/coordination/read-user-focus-defer";
import { getRecentKnowledgeEntities } from "@/lib/knowledge/knowledge-entity-db";
import { FIXED_CALENDAR_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";

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
