"use client";

import { useEffect } from "react";
import { FOCUS_SESSION_UPDATED } from "@/lib/action-chat/mention-focus/focus-session-store";
import { EVENT_CANDIDATES_UPDATED } from "@/lib/life-read-model/candidates-updated";
import { KNOWLEDGE_ENTITY_UPDATED } from "@/lib/knowledge/knowledge-entity-db";
import { syncAgentCoordinationFocusState } from "@/lib/globe/market/coordination/agent-negotiation-store";

/** Sync focus defer / resume + calendar busy across active coordination rooms. */
export function useAgentCoordinationFocusSync(): void {
  useEffect(() => {
    void syncAgentCoordinationFocusState();
    const onCalendarChange = () => {
      void syncAgentCoordinationFocusState();
    };
    window.addEventListener(FOCUS_SESSION_UPDATED, onCalendarChange);
    window.addEventListener(KNOWLEDGE_ENTITY_UPDATED, onCalendarChange);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, onCalendarChange);
    const timer = window.setInterval(() => {
      void syncAgentCoordinationFocusState();
    }, 60_000);
    return () => {
      window.removeEventListener(FOCUS_SESSION_UPDATED, onCalendarChange);
      window.removeEventListener(KNOWLEDGE_ENTITY_UPDATED, onCalendarChange);
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, onCalendarChange);
      window.clearInterval(timer);
    };
  }, []);
}
