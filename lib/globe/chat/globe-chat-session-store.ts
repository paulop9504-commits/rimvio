import type {
  GlobeChatImageMessage,
  GlobeChatMessage,
  GlobeChatResourceCompleteMessage,
  GlobeChatSession,
  GlobeChatSlotPromptMessage,
  GlobeChatTextMessage,
} from "@/lib/globe/chat/globe-chat-session-types";

export const GLOBE_CHAT_SESSION_CHANGE = "rimvio:globe-chat-session-change";

const sessions = new Map<string, GlobeChatSession>();

function emit(graphId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const session = sessions.get(graphId) ?? null;
  window.dispatchEvent(
    new CustomEvent<{ graphId: string; session: GlobeChatSession | null }>(
      GLOBE_CHAT_SESSION_CHANGE,
      { detail: { graphId, session } },
    ),
  );
}

function ensureSession(graphId: string): GlobeChatSession {
  const existing = sessions.get(graphId);
  if (existing) {
    return existing;
  }
  const created: GlobeChatSession = {
    graphId,
    messages: [],
    updatedAt: new Date().toISOString(),
  };
  sessions.set(graphId, created);
  return created;
}

function nextId(): string {
  return `gchat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readGlobeChatSession(graphId: string | null | undefined): GlobeChatSession | null {
  if (!graphId?.trim()) {
    return null;
  }
  return sessions.get(graphId.trim()) ?? null;
}

export function appendGlobeChatSlotPromptMessage(input: {
  graphId: string;
  text: string;
  clarifyKind: GlobeChatSlotPromptMessage["clarifyKind"];
  slotId: string;
  choices?: readonly { id: string; labelKo: string }[];
  categoryOptions?: readonly { id: string; labelKo: string }[];
}): GlobeChatSlotPromptMessage {
  const session = ensureSession(input.graphId);
  const message: GlobeChatSlotPromptMessage = {
    id: nextId(),
    role: "assistant",
    kind: "slot_prompt",
    text: input.text.trim(),
    clarifyKind: input.clarifyKind,
    slotId: input.slotId,
    choices: input.choices,
    categoryOptions: input.categoryOptions,
    createdAt: new Date().toISOString(),
  };
  session.messages = [...session.messages, message];
  session.updatedAt = message.createdAt;
  emit(input.graphId);
  return message;
}

export function appendGlobeChatTextMessage(input: {
  graphId: string;
  role: "user" | "assistant";
  text: string;
}): GlobeChatTextMessage {
  const session = ensureSession(input.graphId);
  const message: GlobeChatTextMessage = {
    id: nextId(),
    role: input.role,
    kind: "text",
    text: input.text.trim(),
    createdAt: new Date().toISOString(),
  };
  session.messages = [...session.messages, message];
  session.updatedAt = message.createdAt;
  emit(input.graphId);
  return message;
}

export function appendGlobeChatResourceCompleteMessage(input: {
  graphId: string;
  text: string;
  resourceId: string;
  eventId: string;
  productName: string;
  anchorLat: number;
  anchorLng: number;
  visibility: GlobeChatResourceCompleteMessage["visibility"];
}): GlobeChatResourceCompleteMessage {
  const session = ensureSession(input.graphId);
  const message: GlobeChatResourceCompleteMessage = {
    id: nextId(),
    role: "assistant",
    kind: "resource_complete",
    text: input.text.trim(),
    resourceId: input.resourceId,
    eventId: input.eventId,
    productName: input.productName.trim(),
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
    visibility: input.visibility,
    createdAt: new Date().toISOString(),
  };
  session.messages = [...session.messages, message];
  session.updatedAt = message.createdAt;
  emit(input.graphId);
  return message;
}

export function appendGlobeChatImageMessage(input: {
  graphId: string;
  localUrl: string;
  status?: GlobeChatImageMessage["status"];
}): GlobeChatImageMessage {
  const session = ensureSession(input.graphId);
  const message: GlobeChatImageMessage = {
    id: nextId(),
    role: "user",
    kind: "image",
    localUrl: input.localUrl,
    status: input.status ?? "uploading",
    createdAt: new Date().toISOString(),
  };
  session.messages = [...session.messages, message];
  session.updatedAt = message.createdAt;
  emit(input.graphId);
  return message;
}

export function patchGlobeChatImageMessage(input: {
  graphId: string;
  messageId: string;
  status: GlobeChatImageMessage["status"];
  remoteUrl?: string | null;
}): void {
  const session = sessions.get(input.graphId);
  if (!session) {
    return;
  }
  session.messages = session.messages.map((message) => {
    if (message.kind !== "image" || message.id !== input.messageId) {
      return message;
    }
    return {
      ...message,
      status: input.status,
      remoteUrl: input.remoteUrl ?? message.remoteUrl,
    };
  });
  session.updatedAt = new Date().toISOString();
  emit(input.graphId);
}

export function readGlobeChatMessages(graphId: string | null | undefined): readonly GlobeChatMessage[] {
  return readGlobeChatSession(graphId)?.messages ?? [];
}

export function clearGlobeChatSession(graphId?: string | null): void {
  if (graphId?.trim()) {
    sessions.delete(graphId.trim());
    emit(graphId.trim());
    return;
  }
  sessions.clear();
}

export function resetGlobeChatSessionStoreForTests(): void {
  clearGlobeChatSession();
}

export function subscribeGlobeChatSessionChange(
  listener: (detail: { graphId: string; session: GlobeChatSession | null }) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<{ graphId: string; session: GlobeChatSession | null }>).detail);
  };
  window.addEventListener(GLOBE_CHAT_SESSION_CHANGE, handler);
  return () => window.removeEventListener(GLOBE_CHAT_SESSION_CHANGE, handler);
}
