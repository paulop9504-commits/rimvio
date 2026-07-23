"use client";

import { EVENT_CANDIDATES_UPDATED } from "@/lib/life-read-model/candidates-updated";
import { KNOWLEDGE_ENTITY_UPDATED } from "@/lib/knowledge/knowledge-entity-db";

/** Must match `FOCUS_SESSION_UPDATED` in action-chat focus-session-store. */
const FOCUS_SESSION_UPDATED_EVENT = "rimvio-focus-session-updated";

export type CoordinationContextSignalOptions = {
  /** Include focus-session changes (default true). */
  includeFocusSession?: boolean;
  /**
   * Life-event candidate churn (default false).
   * Candidate updates are too hot for coordination focus_sync — they caused 401 storms.
   */
  includeEventCandidates?: boolean;
  /** Include knowledge entity updates (default true). */
  includeKnowledge?: boolean;
  /** Debounce rapid bursts (default 150ms). */
  debounceMs?: number;
};

/** One subscriber for focus + calendar/knowledge invalidation signals. */
export function subscribeCoordinationContextSignals(
  onChange: () => void,
  options?: CoordinationContextSignalOptions,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const includeFocusSession = options?.includeFocusSession !== false;
  const includeEventCandidates = options?.includeEventCandidates === true;
  const includeKnowledge = options?.includeKnowledge !== false;
  const debounceMs = options?.debounceMs ?? 150;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const emit = () => {
    if (debounceMs <= 0) {
      onChange();
      return;
    }
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      onChange();
    }, debounceMs);
  };

  if (includeKnowledge) {
    window.addEventListener(KNOWLEDGE_ENTITY_UPDATED, emit);
  }
  if (includeEventCandidates) {
    window.addEventListener(EVENT_CANDIDATES_UPDATED, emit);
  }
  if (includeFocusSession) {
    window.addEventListener(FOCUS_SESSION_UPDATED_EVENT, emit);
  }

  return () => {
    if (timer) {
      clearTimeout(timer);
    }
    if (includeKnowledge) {
      window.removeEventListener(KNOWLEDGE_ENTITY_UPDATED, emit);
    }
    if (includeEventCandidates) {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, emit);
    }
    if (includeFocusSession) {
      window.removeEventListener(FOCUS_SESSION_UPDATED_EVENT, emit);
    }
  };
}