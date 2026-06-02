import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";

const STORAGE_PREFIX = "glango.action-chat.v1";

function storageKey(scopeId: string) {
  return `${STORAGE_PREFIX}.${scopeId}`;
}

export function readActionChatMessages(scopeId: string): ActionChatMessage[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = sessionStorage.getItem(storageKey(scopeId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ActionChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeActionChatMessages(
  scopeId: string,
  messages: ActionChatMessage[]
) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(storageKey(scopeId), JSON.stringify(messages.slice(-40)));
}

/** UI reset — messages live only in sessionStorage; memory stays in localStorage. */
export function clearActionChatMessages(scopeId: string) {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(storageKey(scopeId));
}

/** Wipe every in-session chat scope (e.g. 새 대화). Archive current scope first. */
export function clearAllActionChatMessageScopes() {
  if (typeof window === "undefined") {
    return;
  }

  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith(`${STORAGE_PREFIX}.`)) {
      sessionStorage.removeItem(key);
    }
  }
}

export function actionChatScopeId(linkId?: string | null) {
  return linkId?.trim() || "free";
}
