import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import {
  clearFeedPeerTalkSession,
  getFeedPeerTalkSession,
} from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-session";
import { resolveFeedPeerTalkSessionFromMessages } from "@/lib/action-chat/feed-peer-talk/restore-feed-peer-talk-session";

export type EndFeedPeerTalkResult = {
  ended: boolean;
  displayName: string | null;
};

export function closeFeedPeerTalkThreadsInMessages(
  messages: ActionChatMessage[],
): ActionChatMessage[] {
  return messages.map((message) => {
    const thread = message.feedPeerTalkThread;
    if (!thread || thread.closed) {
      return message;
    }
    return {
      ...message,
      feedPeerTalkThread: {
        ...thread,
        closed: true,
        promptLine: `${thread.displayName}님과의 피드 톡을 마쳤어요`,
      },
    };
  });
}

export function endFeedPeerTalkInFeed(deps: {
  readMessages: () => ActionChatMessage[];
  persist: (next: ActionChatMessage[]) => void;
}): EndFeedPeerTalkResult {
  const session =
    getFeedPeerTalkSession() ??
    resolveFeedPeerTalkSessionFromMessages(deps.readMessages());

  if (!session) {
    clearFeedPeerTalkSession();
    return { ended: false, displayName: null };
  }

  clearFeedPeerTalkSession();
  deps.persist(closeFeedPeerTalkThreadsInMessages(deps.readMessages()));

  return { ended: true, displayName: session.displayName };
}

export function buildEndFeedPeerTalkAssistantText(displayName: string | null): string {
  if (displayName?.trim()) {
    return `${displayName.trim()}님과의 피드 톡을 마쳤어요. 이제 AI 피드예요 — 무엇을 도와드릴까요?`;
  }
  return "피드 톡을 마쳤어요. 이제 AI 피드예요 — 무엇을 도와드릴까요?";
}
