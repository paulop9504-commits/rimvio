"use client";

import { PeerChatBubble } from "@/components/peer-chat/peer-chat-bubble";
import { DmChatMessageSkeleton } from "@/components/peer-chat/dm-chat-message-skeleton";
import type { FeedPeerTalkThreadWire } from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-types";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import { DM_CHAT } from "@/lib/peer-chat/dm-chat-density";
import { shouldShowPeerMessageTime } from "@/lib/peer-chat/message-time-visibility";
import { resolveChatBubbleFocusTone } from "@/components/action-chat/chat-ambient-focus";
import type { ChatBubbleGroup } from "@/lib/ui/chat-bubble-group";
import { cn } from "@/lib/utils";

type FeedPeerTalkFeedRowsProps = {
  messageId: string;
  thread: FeedPeerTalkThreadWire;
  parentBubbleGroup: ChatBubbleGroup;
  messages: ActionChatMessage[];
  messageIndex: number;
  focusedTurnIds: Set<string>;
  composerLive: boolean;
};

function peerRowGroup(
  parent: ChatBubbleGroup,
  rowIndex: number,
): ChatBubbleGroup {
  if (rowIndex === 0) {
    return parent;
  }
  return parent === "single" || parent === "last" ? "last" : "middle";
}

function FeedPeerTalkRow({
  messageId,
  rowKey,
  thread,
  peerIndex,
  allPeerMessages,
  slice,
  parentBubbleGroup,
  rowIndex,
  focusedTurnIds,
  composerLive,
}: {
  messageId: string;
  rowKey: string;
  thread: FeedPeerTalkThreadWire;
  peerIndex: number;
  allPeerMessages: FeedPeerTalkThreadWire["messages"];
  slice: FeedPeerTalkThreadWire["messages"][number];
  parentBubbleGroup: ChatBubbleGroup;
  rowIndex: number;
  focusedTurnIds: Set<string>;
  composerLive: boolean;
}) {
  const group = peerRowGroup(parentBubbleGroup, rowIndex);
  const focusTone = resolveChatBubbleFocusTone(
    messageId,
    focusedTurnIds,
    composerLive,
  );

  return (
    <div
      key={rowKey}
      data-message-id={messageId}
      data-feed-peer-talk-row={slice.id}
      className="chat-message-focus"
      data-bubble-focus={focusTone}
      data-bubble-group={group}
      data-bubble-role="assistant"
    >
      <div className={cn("flex flex-col", DM_CHAT.listGap)}>
        <PeerChatBubble
          message={slice}
          simple
          as="div"
          showTime={shouldShowPeerMessageTime(allPeerMessages, peerIndex)}
        />
      </div>
    </div>
  );
}

/** 피드 타임라인에 DM 말풍선을 그대로 펼침 — 테두리·내부 입력창 없음 */
export function FeedPeerTalkFeedRows({
  messageId,
  thread,
  parentBubbleGroup,
  messages,
  messageIndex,
  focusedTurnIds,
  composerLive,
}: FeedPeerTalkFeedRowsProps) {
  const showSkeleton = thread.hydrating && thread.messages.length === 0;
  const historyEnd = thread.historyEndIndex;
  const prior =
    historyEnd >= 0 ? thread.messages.slice(0, historyEnd + 1) : thread.messages;
  const fresh = historyEnd >= 0 ? thread.messages.slice(historyEnd + 1) : [];

  if (showSkeleton) {
    return (
      <div
        data-message-id={messageId}
        className="chat-message-focus py-1"
        data-bubble-role="assistant"
      >
        <DmChatMessageSkeleton />
      </div>
    );
  }

  if (thread.messages.length === 0) {
    return (
      <div
        data-message-id={messageId}
        className="chat-message-focus py-3 text-center text-[11px] text-white/45"
        data-bubble-role="assistant"
      >
        - {thread.promptLine} -
      </div>
    );
  }

  let rowIndex = 0;

  return (
    <>
      {prior.map((slice, i) => (
        <FeedPeerTalkRow
          key={`${messageId}-prior-${slice.id}`}
          messageId={messageId}
          rowKey={`${messageId}-prior-${slice.id}`}
          thread={thread}
          peerIndex={i}
          allPeerMessages={thread.messages}
          slice={slice}
          parentBubbleGroup={parentBubbleGroup}
          rowIndex={rowIndex++}
          focusedTurnIds={focusedTurnIds}
          composerLive={composerLive}
        />
      ))}
      <div
        data-message-id={messageId}
        className="chat-message-focus py-2 text-center text-[11px] text-white/45"
        data-bubble-role="assistant"
        aria-hidden={messages[messageIndex] ? undefined : true}
      >
        - {thread.promptLine} -
      </div>
      {fresh.map((slice, i) => (
        <FeedPeerTalkRow
          key={`${messageId}-fresh-${slice.id}`}
          messageId={messageId}
          rowKey={`${messageId}-fresh-${slice.id}`}
          thread={thread}
          peerIndex={prior.length + i}
          allPeerMessages={thread.messages}
          slice={slice}
          parentBubbleGroup={parentBubbleGroup}
          rowIndex={rowIndex++}
          focusedTurnIds={focusedTurnIds}
          composerLive={composerLive}
        />
      ))}
    </>
  );
}
