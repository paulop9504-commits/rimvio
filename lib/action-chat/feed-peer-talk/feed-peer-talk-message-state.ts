import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { FeedPeerTalkThreadWire } from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-types";
import type { PeerMessage } from "@/lib/context/peer-message-types";
import { mergePeerMessages, sortPeerMessages } from "@/lib/peer-chat/message-mapper";
import { FEED_PEER_TALK_HISTORY_LINES } from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-types";

export function sliceFeedPeerTalkHistory(messages: PeerMessage[]): PeerMessage[] {
  return sortPeerMessages(messages).slice(-FEED_PEER_TALK_HISTORY_LINES);
}

export function buildFeedPeerTalkPromptLine(displayName: string): string {
  return `${displayName}님과 대화를 시작하세요`;
}

function stripPeerTalkInlineChips(
  messages: ActionChatMessage[],
): ActionChatMessage[] {
  return messages.filter(
    (message) =>
      !(
        message.role === "assistant" &&
        message.inlineChatAction?.featureId === "peer_talk"
      ),
  );
}

/** @톡 칩(테두리 박스) 제거 후 피드 타임라인에 스레드만 남김 */
export function replaceLastPeerTalkChipWithThread(
  messages: ActionChatMessage[],
  wire: FeedPeerTalkThreadWire,
): { messages: ActionChatMessage[]; threadMessageId: string } {
  let threadMessageId = crypto.randomUUID();
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (
      message?.role === "assistant" &&
      message.inlineChatAction?.featureId === "peer_talk"
    ) {
      threadMessageId = message.id;
      break;
    }
  }

  const existingThreadIdx = messages.findIndex(
    (message) =>
      message.feedPeerTalkThread?.peerThreadId === wire.peerThreadId,
  );
  if (existingThreadIdx >= 0) {
    threadMessageId = messages[existingThreadIdx]!.id;
  }

  const cleaned = stripPeerTalkInlineChips(messages).filter(
    (message) =>
      message.feedPeerTalkThread?.peerThreadId !== wire.peerThreadId,
  );

  const threadMessage: ActionChatMessage = {
    id: threadMessageId,
    role: "assistant",
    text: "",
    createdAt: new Date().toISOString(),
    feedPeerTalkThread: wire,
  };

  return {
    messages: [...cleaned, threadMessage],
    threadMessageId,
  };
}

export function patchFeedPeerTalkThread(
  messages: ActionChatMessage[],
  threadMessageId: string,
  patch: Partial<FeedPeerTalkThreadWire>,
): ActionChatMessage[] {
  return messages.map((message) => {
    if (message.id !== threadMessageId || !message.feedPeerTalkThread) {
      return message;
    }
    return {
      ...message,
      feedPeerTalkThread: {
        ...message.feedPeerTalkThread,
        ...patch,
      },
    };
  });
}

export function appendFeedPeerTalkMessage(
  messages: ActionChatMessage[],
  peerThreadId: string,
  incoming: PeerMessage,
): ActionChatMessage[] {
  return messages.map((message) => {
    const thread = message.feedPeerTalkThread;
    if (!thread || thread.peerThreadId !== peerThreadId) {
      return message;
    }
    return {
      ...message,
      feedPeerTalkThread: {
        ...thread,
        messages: mergePeerMessages(thread.messages, incoming),
      },
    };
  });
}
