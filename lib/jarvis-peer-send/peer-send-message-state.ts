import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import {
  patchInlineChatPeerSendWire,
  type InlineChatPeerSendWire,
} from "@/lib/jarvis-peer-send/inline-chat-peer-send";

export function findPendingPeerSendMessage(
  messages: readonly ActionChatMessage[],
): { messageId: string; wire: InlineChatPeerSendWire } | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== "assistant" || !message.inlineChatPeerSend) {
      continue;
    }
    if (message.inlineChatPeerSend.status === "pending") {
      return { messageId: message.id, wire: message.inlineChatPeerSend };
    }
  }
  return null;
}

export function applyPeerSendConfirmToMessages(
  messages: readonly ActionChatMessage[],
  messageId: string,
  patch: Partial<
    Pick<
      InlineChatPeerSendWire,
      | "status"
      | "sentMessageId"
      | "errorKo"
      | "recipientDisplayName"
      | "peerThreadId"
      | "messageBody"
      | "disambiguation"
    >
  >,
  assistantFollowUp?: string,
): ActionChatMessage[] {
  const next = messages.map((message) => {
    if (message.id !== messageId || !message.inlineChatPeerSend) {
      return message;
    }
    return {
      ...message,
      inlineChatPeerSend: patchInlineChatPeerSendWire(
        message.inlineChatPeerSend,
        patch,
      ),
    };
  });

  if (assistantFollowUp?.trim()) {
    next.push({
      id: crypto.randomUUID(),
      role: "assistant",
      text: assistantFollowUp.trim(),
      createdAt: new Date().toISOString(),
    });
  }

  return next;
}

export function applyPeerSendPickContactToMessages(
  messages: readonly ActionChatMessage[],
  messageId: string,
  input: {
    peerThreadId: string;
    displayName: string;
    messageBody: string;
  },
): ActionChatMessage[] {
  return messages.map((message) => {
    if (message.id !== messageId || !message.inlineChatPeerSend) {
      return message;
    }
    return {
      ...message,
      inlineChatPeerSend: patchInlineChatPeerSendWire(message.inlineChatPeerSend, {
        peerThreadId: input.peerThreadId,
        recipientDisplayName: input.displayName,
        messageBody: input.messageBody,
        disambiguation: undefined,
      }),
    };
  });
}
