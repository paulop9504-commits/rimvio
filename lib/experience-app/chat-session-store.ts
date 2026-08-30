/**
 * Agent Chat turns — Chat is Home. sessionStorage per app session.
 */

import type { AgentActionCard, AgentChatTurn } from "@/lib/experience-app/surface-types";
import { readSessionContext } from "@/lib/experience-app/surface-stack-store";

const KEY_PREFIX = "rimvio.experience-app.chat.v1";

let chatMemory: AgentChatTurn[] = [];

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function storageKey(): string {
  return `${KEY_PREFIX}.${readSessionContext().sessionId}`;
}

function persist(): void {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.setItem(storageKey(), JSON.stringify(chatMemory));
    window.dispatchEvent(new CustomEvent("rimvio:experience-chat"));
  } catch {
    /* quota */
  }
}

export function readChatTurns(): readonly AgentChatTurn[] {
  if (!canUseStorage()) return chatMemory;
  try {
    const raw = window.sessionStorage.getItem(storageKey());
    if (!raw) return chatMemory;
    chatMemory = JSON.parse(raw) as AgentChatTurn[];
    return chatMemory;
  } catch {
    return chatMemory;
  }
}

export function appendChatTurn(input: {
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly cards?: readonly AgentActionCard[];
}): AgentChatTurn {
  const turn: AgentChatTurn = {
    id: `turn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    role: input.role,
    text: input.text,
    cards: input.cards,
    at: new Date().toISOString(),
  };
  chatMemory = [...readChatTurns(), turn];
  persist();
  return turn;
}

export function subscribeChatTurns(listener: () => void): () => void {
  if (!canUseStorage()) return () => {};
  window.addEventListener("rimvio:experience-chat", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("rimvio:experience-chat", listener);
    window.removeEventListener("storage", listener);
  };
}

export function resetChatTurns(): void {
  chatMemory = [];
  if (canUseStorage()) {
    window.sessionStorage.removeItem(storageKey());
  }
}
