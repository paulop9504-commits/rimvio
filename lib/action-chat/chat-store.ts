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

export function actionChatScopeId(linkId?: string | null) {
  return linkId?.trim() || "free";
}
