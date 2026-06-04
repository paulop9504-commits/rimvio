import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import {
  appendFeedPeerTalkMessage,
  buildFeedPeerTalkPromptLine,
  patchFeedPeerTalkThread,
  removeFeedPeerTalkMessageById,
  replaceFeedPeerTalkPendingMessage,
  replaceLastPeerTalkChipWithThread,
  sliceFeedPeerTalkHistory,
} from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-message-state";
import type { PeerMessage } from "@/lib/context/peer-message-types";
import { toast } from "sonner";
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

  const pendingId = `pending-${Date.now()}`;
  const optimistic: PeerMessage = {
    id: pendingId,
    peerThreadId: session.peerThreadId,
    author: "me",
    body: trimmed,
    sentAt: new Date().toISOString(),
    messageType: "human",
  };

  deps.persist(
    appendFeedPeerTalkMessage(
      deps.readMessages(),
      session.peerThreadId,
      optimistic,
    ),
  );

  try {
    const sent = await sendPeerMessageRemote({
      threadId: session.peerThreadId,
      displayName: session.displayName,
      body: trimmed,
    });

    deps.persist(
      replaceFeedPeerTalkPendingMessage(
        deps.readMessages(),
        session.peerThreadId,
        pendingId,
        sent,
      ),
    );

    void syncFeedSlotFromRoomRemote(session.peerThreadId)
      .then(() => emitFeedSlotsRefresh())
      .catch(() => emitFeedSlotsRefresh());

    return true;
  } catch (error) {
    deps.persist(
      removeFeedPeerTalkMessageById(
        deps.readMessages(),
        session.peerThreadId,
        pendingId,
      ),
    );
    const message =
      error instanceof Error ? error.message : "메시지를 보내지 못했어요";
    toast.error(message);
    throw error instanceof Error ? error : new Error(message);
  }
}

export function resetFeedPeerTalkSession(): void {
  clearFeedPeerTalkSession();
}
