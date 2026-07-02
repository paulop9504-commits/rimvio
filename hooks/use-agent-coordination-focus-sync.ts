"use client";

import { useEffect } from "react";
import { FOCUS_SESSION_UPDATED } from "@/lib/action-chat/mention-focus/focus-session-store";
import { KNOWLEDGE_ENTITY_UPDATED } from "@/lib/knowledge/knowledge-entity-db";
import { syncAgentCoordinationFocusState } from "@/lib/globe/market/coordination/agent-negotiation-store";

/** Sync focus defer / resume across active coordination rooms. */
export function useAgentCoordinationFocusSync(): void {
  useEffect(() => {
    void syncAgentCoordinationFocusState();
    const onFocusChange = () => {
      void syncAgentCoordinationFocusState();
    };
    window.addEventListener(FOCUS_SESSION_UPDATED, onFocusChange);
    window.addEventListener(KNOWLEDGE_ENTITY_UPDATED, onFocusChange);
    const timer = window.setInterval(() => {
      void syncAgentCoordinationFocusState();
    }, 60_000);
    return () => {
      window.removeEventListener(FOCUS_SESSION_UPDATED, onFocusChange);
      window.removeEventListener(KNOWLEDGE_ENTITY_UPDATED, onFocusChange);
      window.clearInterval(timer);
    };
  }, []);
}
