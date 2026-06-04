import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { FeedPeerTalkSession } from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-types";
import {
  getFeedPeerTalkSession,
  clearFeedPeerTalkSession,
} from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-session";

/** True only when an open (non-closed) inline @톡 thread is on screen — not session memory alone. */
export function isFeedPeerTalkSendActive(
  session: FeedPeerTalkSession | null,
  messages: ActionChatMessage[],
): boolean {
  if (!session?.peerThreadId) {
    return false;
  }
  return messages.some(
    (message) =>
      message.feedPeerTalkThread?.peerThreadId === session.peerThreadId &&
      !message.feedPeerTalkThread.closed,
  );
}

/** Drop stale in-memory session when UI no longer shows an open @톡 thread. */
export function syncFeedPeerTalkSessionWithMessages(
  messages: ActionChatMessage[],
): void {
  const session = getFeedPeerTalkSession();
  if (!session) {
    return;
  }
  if (!isFeedPeerTalkSendActive(session, messages)) {
    clearFeedPeerTalkSession();
  }
}
