/**
 * Agent tool — send_internal_message (Rimvio peer DM).
 * SSOT for function-calling schema + deterministic draft helper.
 */

import { composePeerSendMessage } from "@/lib/jarvis-peer-send/compose-peer-send-message";
import { normalizeRecipientQuery } from "@/lib/jarvis-peer-send/parse-jarvis-peer-send-intent";

export const SEND_INTERNAL_MESSAGE_TOOL_NAME = "send_internal_message" as const;

export type SendInternalMessageToolInput = {
  readonly recipient_name: string;
  readonly message_content: string;
  readonly share_trip_label?: string | null;
};

export type SendInternalMessageToolDefinition = {
  readonly name: typeof SEND_INTERNAL_MESSAGE_TOOL_NAME;
  readonly description: string;
  readonly parameters: {
    readonly type: "object";
    readonly properties: {
      readonly recipient_name: {
        readonly type: "string";
        readonly description: string;
      };
      readonly message_content: {
        readonly type: "string";
        readonly description: string;
      };
      readonly share_trip_label: {
        readonly type: "string";
        readonly description: string;
      };
    };
    readonly required: readonly ["recipient_name", "message_content"];
  };
};

export const SEND_INTERNAL_MESSAGE_TOOL: SendInternalMessageToolDefinition = {
  name: SEND_INTERNAL_MESSAGE_TOOL_NAME,
  description: "자체 메신저를 통해 특정 Rimvio 친구에게 메시지를 전송합니다.",
  parameters: {
    type: "object",
    properties: {
      recipient_name: {
        type: "string",
        description: "수신자 표시 이름 (예: 동준)",
      },
      message_content: {
        type: "string",
        description: "보낼 메시지 본문",
      },
      share_trip_label: {
        type: "string",
        description: "일정/여행 카드 공유 시 제목 (선택)",
      },
    },
    required: ["recipient_name", "message_content"],
  },
};

/** Normalize tool args → recipient query + composed body. */
export function normalizeSendInternalMessageToolInput(
  input: SendInternalMessageToolInput,
): {
  readonly recipientQuery: string;
  readonly messageBody: string;
  readonly shareTripLabel: string | null;
} {
  const recipientQuery = normalizeRecipientQuery(input.recipient_name);
  const messageBody = composePeerSendMessage({
    recipientDisplayName: recipientQuery,
    intentText: input.message_content.trim(),
    shareTripLabel: input.share_trip_label ?? null,
  });
  return {
    recipientQuery,
    messageBody,
    shareTripLabel: input.share_trip_label?.trim() || null,
  };
}
