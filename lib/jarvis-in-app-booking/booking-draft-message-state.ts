import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import {
  patchInlineChatBookingDraftWire,
  type InlineChatBookingDraftWire,
} from "@/lib/jarvis-in-app-booking/inline-chat-booking-draft";
import type { BookingLodgingCandidate } from "@/lib/jarvis-in-app-booking/resolve-booking-lodging";

export function findPendingBookingDraftMessage(
  messages: readonly ActionChatMessage[],
): { messageId: string; wire: InlineChatBookingDraftWire } | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== "assistant" || !message.inlineChatBookingDraft) {
      continue;
    }
    if (message.inlineChatBookingDraft.status === "pending") {
      return { messageId: message.id, wire: message.inlineChatBookingDraft };
    }
  }
  return null;
}

export function applyBookingDraftConfirmToMessages(
  messages: readonly ActionChatMessage[],
  messageId: string,
  patch: Partial<
    Pick<
      InlineChatBookingDraftWire,
      | "status"
      | "operationId"
      | "errorKo"
      | "placeId"
      | "placeName"
      | "lat"
      | "lng"
      | "amountLabel"
      | "disambiguation"
    >
  >,
  assistantFollowUp?: string,
): ActionChatMessage[] {
  const next = messages.map((message) => {
    if (message.id !== messageId || !message.inlineChatBookingDraft) {
      return message;
    }
    return {
      ...message,
      inlineChatBookingDraft: patchInlineChatBookingDraftWire(
        message.inlineChatBookingDraft,
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

export function applyBookingDraftPickLodgingToMessages(
  messages: readonly ActionChatMessage[],
  messageId: string,
  candidate: BookingLodgingCandidate,
): ActionChatMessage[] {
  return messages.map((message) => {
    if (message.id !== messageId || !message.inlineChatBookingDraft) {
      return message;
    }
    return {
      ...message,
      inlineChatBookingDraft: patchInlineChatBookingDraftWire(
        message.inlineChatBookingDraft,
        {
          placeId: candidate.id,
          placeName: candidate.labelKo,
          lat: candidate.lat,
          lng: candidate.lng,
          amountLabel: candidate.amountLabel ?? null,
          disambiguation: undefined,
        },
      ),
    };
  });
}
