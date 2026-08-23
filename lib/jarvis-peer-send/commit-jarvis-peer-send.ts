import { emitFeedSlotsRefresh } from "@/lib/feed/feed-slots-events";
import { ingestPeerTalkMarble } from "@/lib/inside-out/marble-ingest";
import {
  sendPeerMessageRemote,
  syncFeedSlotFromRoomRemote,
} from "@/lib/peer-chat/peer-chat-client";
import type { InlineChatPeerSendWire } from "@/lib/jarvis-peer-send/inline-chat-peer-send";
import { clearPendingJarvisPeerSend } from "@/lib/jarvis-peer-send/pending-jarvis-peer-send-store";

export type CommitJarvisPeerSendResult =
  | { readonly ok: true; readonly messageId: string }
  | { readonly ok: false; readonly errorKo: string };

export async function commitJarvisPeerSend(
  wire: InlineChatPeerSendWire,
): Promise<CommitJarvisPeerSendResult> {
  const body = wire.messageBody.trim();
  const threadId = wire.peerThreadId.trim();
  const displayName = wire.recipientDisplayName.trim();

  if (!body || !threadId || !displayName) {
    return { ok: false, errorKo: "보낼 메시지 또는 수신자 정보가 없어요." };
  }

  try {
    const sent = await sendPeerMessageRemote({
      threadId,
      displayName,
      body,
    });

    const marble = ingestPeerTalkMarble({
      body,
      peerThreadId: threadId,
      messageId: sent.id,
      displayName,
    });
    if (marble && typeof console !== "undefined") {
      console.debug("[Rimvio IO] MARBLE_INGEST_PEER_SEND", {
        eventId: marble.id,
        title: marble.title,
      });
    }

    void syncFeedSlotFromRoomRemote(threadId)
      .then(() => emitFeedSlotsRefresh())
      .catch(() => emitFeedSlotsRefresh());

    clearPendingJarvisPeerSend();
    return { ok: true, messageId: sent.id };
  } catch (error) {
    const errorKo =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "메시지를 보내지 못했어요";
    return { ok: false, errorKo };
  }
}
