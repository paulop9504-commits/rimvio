"use client";

import Link from "next/link";
import { PeerChatBubble } from "@/components/peer-chat/peer-chat-bubble";
import { DmChatMessageSkeleton } from "@/components/peer-chat/dm-chat-message-skeleton";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { useDmPeerProfile } from "@/hooks/use-dm-peer-profile";
import type { FeedPeerTalkThreadWire } from "@/lib/action-chat/feed-peer-talk/feed-peer-talk-types";
import { DM_CHAT } from "@/lib/peer-chat/dm-chat-density";
import { isRegisteredPeerDmThread } from "@/lib/peer-chat/peer-chat-client";
import { shouldShowPeerMessageTime } from "@/lib/peer-chat/message-time-visibility";
import { cn } from "@/lib/utils";

type FeedPeerTalkThreadProps = {
  thread: FeedPeerTalkThreadWire;
  className?: string;
};

function ThreadMessageList({
  allMessages,
  messages,
  startIndex,
}: {
  allMessages: FeedPeerTalkThreadWire["messages"];
  messages: FeedPeerTalkThreadWire["messages"];
  startIndex: number;
}) {
  return (
    <>
      {messages.map((message, index) => (
        <li key={message.id}>
          <PeerChatBubble
            message={message}
            simple
            showTime={shouldShowPeerMessageTime(allMessages, startIndex + index)}
          />
        </li>
      ))}
    </>
  );
}

export function FeedPeerTalkThread({ thread, className }: FeedPeerTalkThreadProps) {
  const phoneDm = isRegisteredPeerDmThread(thread.peerThreadId);
  const { profile } = useDmPeerProfile(thread.peerThreadId, phoneDm);
  const title = profile?.displayName?.trim() || thread.displayName;
  const showSkeleton = thread.hydrating && thread.messages.length === 0;

  const historyEnd = thread.historyEndIndex;
  const prior =
    historyEnd >= 0 ? thread.messages.slice(0, historyEnd + 1) : thread.messages;
  const fresh = historyEnd >= 0 ? thread.messages.slice(historyEnd + 1) : [];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0f0f0f]",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-white/[0.08] px-3 py-2">
        <PeerProfileAvatar
          displayName={title}
          avatarUrl={profile?.avatarUrl}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">{title}</p>
          {profile?.rimvioId ? (
            <p className="truncate text-[11px] text-[#FEE500]/90">@{profile.rimvioId}</p>
          ) : null}
        </div>
        <Link
          href={`/peers/${encodeURIComponent(thread.peerThreadId)}`}
          className="shrink-0 text-[10px] text-white/45 underline-offset-2 hover:text-rimvio-neon-cyan hover:underline"
        >
          ROOM
        </Link>
      </div>

      <div className={cn("max-h-[min(52vh,28rem)] overflow-y-auto", DM_CHAT.listPad)}>
        {showSkeleton ? (
          <DmChatMessageSkeleton />
        ) : thread.messages.length === 0 ? (
          <p className="py-5 text-center text-[11px] text-white/45">
            - {thread.promptLine} -
          </p>
        ) : (
          <ul className={cn("flex flex-col", DM_CHAT.listGap)}>
            <ThreadMessageList
              allMessages={thread.messages}
              messages={prior}
              startIndex={0}
            />
            <li className="py-2 text-center text-[11px] text-white/45">
              - {thread.promptLine} -
            </li>
            {fresh.length > 0 ? (
              <ThreadMessageList
                allMessages={thread.messages}
                messages={fresh}
                startIndex={prior.length}
              />
            ) : null}
          </ul>
        )}
      </div>
    </div>
  );
}
