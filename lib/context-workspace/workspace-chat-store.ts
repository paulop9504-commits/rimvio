/**
 * Workspace chat transcript — Cursor/GPT-style turns in one Workspace.
 * Rich turns carry Workspace patch + Object Cards (same nodeId as map SSOT).
 */

import type { ContextWorkspaceNodeKind } from "@/lib/context-workspace/types";

export type WorkspaceChatRole = "user" | "assistant";

export type WorkspaceChatObjectCard = {
  readonly nodeId: string;
  readonly title: string;
  readonly subtitleKo: string;
  readonly kind: ContextWorkspaceNodeKind;
  readonly ctaKo: string;
};

export type WorkspaceChatPatchStrip = {
  readonly summaryKo: string;
  readonly lodgingDelta?: number;
  readonly poiDelta?: number;
  readonly eateryDelta?: number;
  readonly routeUpdated?: boolean;
};

export type WorkspaceChatTurn = {
  readonly id: string;
  readonly role: WorkspaceChatRole;
  readonly text: string;
  readonly atIso: string;
  readonly patch?: WorkspaceChatPatchStrip | null;
  readonly objects?: readonly WorkspaceChatObjectCard[];
  readonly dayPlanLines?: readonly string[];
  readonly showLinkedWorkCta?: boolean;
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
  patch?: WorkspaceChatPatchStrip | null;
  objects?: readonly WorkspaceChatObjectCard[];
  dayPlanLines?: readonly string[];
  showLinkedWorkCta?: boolean;
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
    patch: input.patch ?? null,
    objects: input.objects ?? [],
    dayPlanLines: input.dayPlanLines ?? [],
    showLinkedWorkCta: input.showLinkedWorkCta === true,
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
