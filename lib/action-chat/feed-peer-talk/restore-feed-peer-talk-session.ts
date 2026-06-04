import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { FeedPeerTalkSession } from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-types";

/** 피드 새로고침 후에도 하단 composer 가 DM 전송을 이어가도록 */
export function resolveFeedPeerTalkSessionFromMessages(
  messages: ActionChatMessage[],
): FeedPeerTalkSession | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const thread = messages[i]?.feedPeerTalkThread;
    if (thread?.peerThreadId && !thread.closed) {
      return {
        peerThreadId: thread.peerThreadId,
        displayName: thread.displayName.trim() || "친구",
      };
    }
  }
  return null;
}
