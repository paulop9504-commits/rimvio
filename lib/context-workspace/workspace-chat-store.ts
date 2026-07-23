/**
 * Workspace chat transcript — Cursor/GPT-style turns in one Workspace.
 */

export type WorkspaceChatRole = "user" | "assistant";

export type WorkspaceChatTurn = {
  readonly id: string;
  readonly role: WorkspaceChatRole;
  readonly text: string;
  readonly atIso: string;
};

const memory = new Map<string, WorkspaceChatTurn[]>();
const MAX_TURNS = 80;

export const WORKSPACE_CHAT_UPDATED = "rimvio:workspace-chat-updated";

function emit(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_CHAT_UPDATED, {
      detail: { contextEventId },
    }),
  );
}

export function readWorkspaceChat(
  contextEventId: string,
): readonly WorkspaceChatTurn[] {
  return memory.get(contextEventId.trim()) ?? [];
}

export function clearWorkspaceChat(contextEventId: string): void {
  const key = contextEventId.trim();
  if (!key) {
    return;
  }
  memory.delete(key);
  emit(key);
}

export function appendWorkspaceChatTurn(input: {
  contextEventId: string;
  role: WorkspaceChatRole;
  text: string;
}): WorkspaceChatTurn | null {
  const key = input.contextEventId.trim();
  const text = input.text.trim();
  if (!key || !text) {
    return null;
  }
  const turn: WorkspaceChatTurn = {
    id: `wchat:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
    role: input.role,
    text,
    atIso: new Date().toISOString(),
  };
  const prev = memory.get(key) ?? [];
  memory.set(key, [...prev, turn].slice(-MAX_TURNS));
  emit(key);
  return turn;
}

export function subscribeWorkspaceChatUpdated(
  listener: (contextEventId: string) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ contextEventId: string }>).detail;
    if (detail?.contextEventId) {
      listener(detail.contextEventId);
    }
  };
  window.addEventListener(WORKSPACE_CHAT_UPDATED, handler);
  return () => window.removeEventListener(WORKSPACE_CHAT_UPDATED, handler);
}
