import { classifyIntentRouter } from "@/lib/action-chat/mode-switching";
import { isConversationalOnlyMessage } from "@/lib/action-chat/conversation-turns";
import { buildExtractedDataFromText } from "@/lib/action-chat/confirmation-logic";
import { normalizeExtractedPlaceData } from "@/lib/action-chat/resolve-navigation-place";
import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";
import {
  buildSystemQueryReply,
  isSystemQuery,
  looksLikePlaceInput,
} from "@/lib/action-chat/confirm-input-guard";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";

export type ConfirmInterruptKind =
  | "continue_confirm"
  | "cancel_task"
  | "system_query"
  | "location_correction"
  | "off_topic";

const CONTINUE_CONFIRM =
  /^(?:네|맞(?:아|아요|습니다|음)?|계속|응|ㅇㅇ|yes|ok|확인)(?:[!?.~ㅋㅎ\s]*)?$/iu;

const CANCEL_TASK =
  /^(?:취소|그만|나중|안\s*할|하지\s*마|stop|cancel|다른\s*질문)(?:[!?.~ㅋㅎ\s]*)?$/iu;

export function findPendingPlaceConfirm(
  messages: ActionChatMessage[]
): ActionChatMessage | null {
  return (
    [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant" &&
          message.pendingConfirm &&
          message.confirmation?.meta?.intent === "CONFIRM" &&
          !message.actionsRevealed &&
          (message.actions?.length ?? 0) === 0
      ) ?? null
  );
}

export function classifyConfirmInterrupt(userMessage: string): ConfirmInterruptKind {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return "off_topic";
  }

  if (CANCEL_TASK.test(trimmed)) {
    return "cancel_task";
  }

  if (CONTINUE_CONFIRM.test(trimmed)) {
    return "continue_confirm";
  }

  if (isSystemQuery(trimmed)) {
    return "system_query";
  }

  if (looksLikePlaceInput(trimmed)) {
    return "location_correction";
  }

  if (
    isConversationalOnlyMessage(trimmed) ||
    classifyIntentRouter(trimmed).mode === "conversation"
  ) {
    return "off_topic";
  }

  return "off_topic";
}

export function respondToConfirmSystemQuery(
  messages: ActionChatMessage[],
  assistantId: string,
  userMessage: ActionChatMessage
): ActionChatMessage[] {
  const reply = buildSystemQueryReply();

  return [
    ...messages.map((message) =>
      message.id === assistantId && message.confirmation
        ? {
            ...message,
            confirmation: {
              ...message.confirmation,
              interrupt: undefined,
            },
          }
        : message
    ),
    userMessage,
    {
      id: crypto.randomUUID(),
      role: "assistant",
      text: reply,
      createdAt: new Date().toISOString(),
    },
  ];
}

export function applyLocationCorrectionToConfirm(
  messages: ActionChatMessage[],
  assistantId: string,
  userMessage: ActionChatMessage,
  corrected: ConfirmationExtractedData
): ActionChatMessage[] {
  const merged = messages.map((message) => {
    if (message.id !== assistantId || !message.confirmation) {
      return message;
    }

    const prior = message.confirmation.extracted_data ?? {
      address: null,
      phone: null,
      datetime: null,
      place_name: null,
      url: null,
    };

    return {
      ...message,
      confirmation: {
        ...message.confirmation,
        extracted_data: {
          ...prior,
          ...corrected,
          datetime: corrected.datetime ?? prior.datetime,
        },
        interrupt: undefined,
      },
    };
  });

  return [...merged, userMessage];
}

export function buildLocationCorrectionFromInput(
  message: string,
  prior: ConfirmationExtractedData | undefined,
  referenceDate: string
): ConfirmationExtractedData {
  const parsed = buildExtractedDataFromText(message, referenceDate);
  return normalizeExtractedPlaceData(
    {
      address: parsed.address ?? prior?.address ?? null,
      phone: parsed.phone ?? prior?.phone ?? null,
      datetime: parsed.datetime ?? prior?.datetime ?? null,
      place_name: parsed.place_name ?? prior?.place_name ?? null,
      url: parsed.url ?? prior?.url ?? null,
    },
    message
  );
}

export function attachConfirmInterrupt(
  messages: ActionChatMessage[],
  assistantId: string,
  userMessage: ActionChatMessage,
  interruptText: string
): ActionChatMessage[] {
  return [
    ...messages.map((message) =>
      message.id === assistantId && message.confirmation
        ? {
            ...message,
            confirmation: {
              ...message.confirmation,
              interrupt: {
                user_message: interruptText,
                awaiting_choice: true,
              },
            },
          }
        : message
    ),
    userMessage,
  ];
}

export function clearConfirmInterrupt(
  messages: ActionChatMessage[],
  assistantId: string
): ActionChatMessage[] {
  return messages.map((message) => {
    if (message.id !== assistantId || !message.confirmation) {
      return message;
    }

    const { interrupt: _removed, ...confirmation } = message.confirmation;
    return { ...message, confirmation };
  });
}

export function cancelPendingConfirm(
  messages: ActionChatMessage[],
  assistantId: string,
  userMessage: ActionChatMessage
): ActionChatMessage[] {
  return [
    ...messages.map((message) =>
      message.id === assistantId
        ? {
            ...message,
            pendingConfirm: false,
            text: "알겠어요. 작업을 취소했어요.",
            confirmation: undefined,
          }
        : message
    ),
    userMessage,
  ];
}
