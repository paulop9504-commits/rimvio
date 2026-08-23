import type { PeerContact } from "@/lib/context/peer-contact-types";

export type InlineChatPeerSendStatus =
  | "pending"
  | "sent"
  | "failed"
  | "cancelled";

export type InlineChatPeerSendWire = {
  readonly draftId: string;
  readonly recipientQuery: string;
  readonly recipientDisplayName: string;
  readonly peerThreadId: string;
  readonly messageBody: string;
  readonly intentText: string;
  readonly shareTrip: boolean;
  readonly shareTripLabel?: string | null;
  readonly tripScheduleLines?: readonly string[];
  readonly status: InlineChatPeerSendStatus;
  readonly sentMessageId?: string | null;
  readonly errorKo?: string | null;
  /** When multiple friends match — pick before send. */
  readonly disambiguation?: readonly PeerContact[];
};

export function buildInlineChatPeerSendWire(input: {
  draftId: string;
  recipientQuery: string;
  recipientDisplayName: string;
  peerThreadId: string;
  messageBody: string;
  intentText: string;
  shareTrip?: boolean;
  shareTripLabel?: string | null;
  tripScheduleLines?: readonly string[];
  disambiguation?: readonly PeerContact[];
}): InlineChatPeerSendWire {
  return {
    draftId: input.draftId,
    recipientQuery: input.recipientQuery.trim(),
    recipientDisplayName: input.recipientDisplayName.trim() || "친구",
    peerThreadId: input.peerThreadId.trim(),
    messageBody: input.messageBody.trim(),
    intentText: input.intentText.trim(),
    shareTrip: input.shareTrip ?? false,
    shareTripLabel: input.shareTripLabel?.trim() || null,
    tripScheduleLines: input.tripScheduleLines?.length
      ? input.tripScheduleLines
      : undefined,
    status: "pending",
    disambiguation: input.disambiguation?.length ? input.disambiguation : undefined,
  };
}

export function patchInlineChatPeerSendWire(
  wire: InlineChatPeerSendWire,
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
): InlineChatPeerSendWire {
  return { ...wire, ...patch };
}
