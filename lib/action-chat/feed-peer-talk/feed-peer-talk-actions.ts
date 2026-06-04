import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import {
  appendFeedPeerTalkMessage,
  buildFeedPeerTalkPromptLine,
  patchFeedPeerTalkThread,
  replaceLastPeerTalkChipWithThread,
  sliceFeedPeerTalkHistory,
} from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-message-state";
import {
  clearFeedPeerTalkSession,
  getFeedPeerTalkSession,
  setFeedPeerTalkSession,
} from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-session";
import type { FeedPeerTalkThreadWire } from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-types";
import { emitFeedSlotsRefresh } from "@/lib/feed/feed-slots-events";
import { fetchPeerMessages, sendPeerMessageRemote, syncFeedSlotFromRoomRemote } from "@/lib/peer-chat/peer-chat-client";
import { prefetchPeerMessages, takePrefetchedMessages } from "@/lib/peer-chat/message-prefetch-cache";

type FeedPeerTalkDeps = {
  readMessages: () => ActionChatMessage[];
  persist: (next: ActionChatMessage[]) => void;
};

async function loadPeerHistory(threadId: string): Promise<ReturnType<typeof sliceFeedPeerTalkHistory>> {
  const prefetched = takePrefetchedMessages(threadId);
  if (prefetched) {
    return sliceFeedPeerTalkHistory(prefetched);
  }
  const remote = await fetchPeerMessages(threadId);
  return sliceFeedPeerTalkHistory(remote);
}

export async function startFeedPeerTalkInFeed(
  deps: FeedPeerTalkDeps,
  contact: PeerContact,
): Promise<void> {
  const displayName = contact.displayName.trim() || "친구";
  const peerThreadId = contact.peerThreadId;

  setFeedPeerTalkSession({ peerThreadId, displayName });
  prefetchPeerMessages(peerThreadId);

  const hydratingWire: FeedPeerTalkThreadWire = {
    peerThreadId,
    displayName,
    messages: [],
    historyEndIndex: -1,
    promptLine: buildFeedPeerTalkPromptLine(displayName),
    hydrating: true,
  };

  const { messages: withShell, threadMessageId } = replaceLastPeerTalkChipWithThread(
    deps.readMessages(),
    hydratingWire,
  );
  deps.persist(withShell);

  try {
    const history = await loadPeerHistory(peerThreadId);
    const wire: FeedPeerTalkThreadWire = {
      peerThreadId,
      displayName,
      messages: history,
      historyEndIndex: Math.max(0, history.length - 1),
      promptLine: buildFeedPeerTalkPromptLine(displayName),
      hydrating: false,
    };
    deps.persist(
      patchFeedPeerTalkThread(deps.readMessages(), threadMessageId, wire),
    );
  } catch {
    deps.persist(
      patchFeedPeerTalkThread(deps.readMessages(), threadMessageId, {
        hydrating: false,
        messages: [],
        historyEndIndex: -1,
      }),
    );
  }
}

export async function sendFeedPeerTalkInFeed(
  deps: FeedPeerTalkDeps,
  text: string,
): Promise<boolean> {
  const session = getFeedPeerTalkSession();
  const trimmed = text.trim();
  if (!session || !trimmed) {
    return false;
  }

  const sent = await sendPeerMessageRemote({
    threadId: session.peerThreadId,
    displayName: session.displayName,
    body: trimmed,
  });

  deps.persist(
    appendFeedPeerTalkMessage(
      deps.readMessages(),
      session.peerThreadId,
      sent,
    ),
  );

  void syncFeedSlotFromRoomRemote(session.peerThreadId)
    .then(() => emitFeedSlotsRefresh())
    .catch(() => emitFeedSlotsRefresh());

  return true;
}

export function resetFeedPeerTalkSession(): void {
  clearFeedPeerTalkSession();
}
