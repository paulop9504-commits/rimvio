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

export function replaceLastPeerTalkChipWithThread(
  messages: ActionChatMessage[],
  wire: FeedPeerTalkThreadWire,
): { messages: ActionChatMessage[]; threadMessageId: string } {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (
      message?.role === "assistant" &&
      message.inlineChatAction?.featureId === "peer_talk"
    ) {
      const threadMessageId = message.id;
      const copy = [...messages];
      copy[i] = {
        ...message,
        inlineChatAction: undefined,
        feedPeerTalkThread: wire,
      };
      return { messages: copy, threadMessageId };
    }
  }

  const threadMessageId = crypto.randomUUID();
  return {
    messages: [
      ...messages,
      {
        id: threadMessageId,
        role: "assistant",
        text: "",
        createdAt: new Date().toISOString(),
        feedPeerTalkThread: wire,
      },
    ],
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
