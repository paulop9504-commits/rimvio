"use client";

import type { PeerMessage } from "@/lib/context/peer-message-types";
import { DeepLinkBubbleRow } from "@/components/peer-chat/deep-link-bubble-row";
import {
  PeerMessageRow,
  type PeerMessageRowProfile,
} from "@/components/peer-chat/peer-message-row";
import { DM_CHAT } from "@/lib/peer-chat/dm-chat-density";
import { formatPeerMessageTime } from "@/lib/peer-chat/format-message-time";
import { PeerAiInlineCard } from "@/components/peer-chat/peer-ai-inline-card";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { PEER_MESSAGE_IMAGE_PLACEHOLDER } from "@/lib/peer-chat/peer-chat-image-constants";
import { isPendingPeerMessageId } from "@/lib/peer-chat/optimistic-peer-message";
import { cn } from "@/lib/utils";

type PeerChatBubbleProps = {
  message: PeerMessage;
  simple?: boolean;
  showTime?: boolean;
  showPeerProfileHeader?: boolean;
  peerProfile?: PeerMessageRowProfile | null;
  as?: "li" | "div";
  lensCandidates?: readonly DeepLinkBubbleCandidate[];
  onLensSelect?: (candidate: DeepLinkBubbleCandidate) => void;
  lensDisabled?: boolean;
};

function MessageTime({ time, compact }: { time: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 self-end leading-none text-white/35",
        compact ? cn(DM_CHAT.timeText, "pb-px") : "pb-1 text-[10px]",
      )}
    >
      {time}
    </span>
  );
}

export function PeerChatBubble({
  message,
  simple = false,
  showTime = true,
  showPeerProfileHeader = false,
  peerProfile = null,
  as = "li",
  lensCandidates = [],
  onLensSelect,
  lensDisabled = false,
}: PeerChatBubbleProps) {
  const time =
    showTime && message.sentAt ? formatPeerMessageTime(message.sentAt) : "";

  const isMe = message.author === "me";
  const isPending = isPendingPeerMessageId(message.id);

  const Tag = as;

  const lensOwner =
    peerProfile && !isMe
      ? {
          displayName: peerProfile.displayName,
          avatarUrl: peerProfile.avatarUrl,
          rimvioId: peerProfile.rimvioId,
        }
      : undefined;

  if (message.messageType === "ai_private" || message.messageType === "ai_shared") {
    return (
      <Tag className="w-full max-w-full">
        <PeerMessageRow
          isMe={isMe}
          peer={peerProfile}
          showPeerAvatar={!isMe && showTime}
        >
          <div
            className={cn(
              "flex items-end",
              simple ? DM_CHAT.rowGap : "gap-1.5",
            )}
          >
            {time ? <MessageTime time={time} compact={simple} /> : null}
            <PeerAiInlineCard message={message} simple={simple} />
          </div>
        </PeerMessageRow>
      </Tag>
    );
  }

  const showLens =
    !isMe &&
    lensCandidates.length > 0 &&
    typeof onLensSelect === "function";

  const imageUrl = message.imageUrl?.trim() || null;
  const caption =
    message.body.trim() &&
    message.body.trim() !== PEER_MESSAGE_IMAGE_PLACEHOLDER
      ? message.body
      : null;

  const bubbleBody = imageUrl ? (
    <div
      className={cn(
        "min-w-0 overflow-hidden",
        isPending && isMe && "opacity-85",
        simple ? DM_CHAT.bubbleRadius : "rounded-2xl",
        isMe ? DM_CHAT.bubbleMeCorner : DM_CHAT.bubblePeerCorner,
      )}
    >
      <a
        href={imageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={caption ?? "사진"}
          className="max-h-[min(52dvh,20rem)] w-full max-w-[min(72vw,15rem)] object-cover sm:max-w-[16rem]"
        />
      </a>
      {caption ? (
        <p
          className={cn(
            "whitespace-pre-wrap break-words px-2.5 py-1.5",
            simple
              ? cn(DM_CHAT.bubbleText, isMe ? "text-[#191919]" : "text-[#f5f5f5]")
              : cn("text-[15px]", isMe ? "text-white" : "text-foreground"),
            isMe && simple
              ? "bg-[#FEE500]"
              : !simple && isMe
                ? "bg-rimvio-neon-purple"
                : simple
                  ? "bg-[#2c2c2e]"
                  : "bg-rimvio-surface-raised",
          )}
        >
          {caption}
        </p>
      ) : null}
    </div>
  ) : (
    <div
      className={cn(
        "min-w-0",
        isPending && isMe && "opacity-85",
        simple
          ? cn(
              DM_CHAT.bubblePx,
              DM_CHAT.bubblePy,
              DM_CHAT.bubbleText,
              DM_CHAT.bubbleRadius,
              isMe
                ? cn(DM_CHAT.bubbleMeCorner, "bg-[#FEE500] text-[#191919]")
                : cn(DM_CHAT.bubblePeerCorner, "bg-[#2c2c2e] text-[#f5f5f5]"),
            )
          : cn(
              "rounded-2xl px-4 py-2.5 text-[17px] leading-snug",
              isMe
                ? "rounded-br-md bg-rimvio-neon-purple text-white"
                : "rounded-bl-md bg-rimvio-surface-raised text-foreground",
            ),
      )}
    >
      <p className="whitespace-pre-wrap break-words">{message.body}</p>
    </div>
  );

  return (
    <Tag className="w-full max-w-full">
      <PeerMessageRow
        isMe={isMe}
        peer={peerProfile}
        showPeerAvatar={!isMe && showTime}
        showPeerHandle={showPeerProfileHeader && !isMe}
      >
        <div
          className={cn(
            "flex w-full items-end",
            simple ? DM_CHAT.rowGap : "gap-1.5",
          )}
        >
          {time ? <MessageTime time={time} compact={simple} /> : null}
          {bubbleBody}
        </div>
        {showLens ? (
          <DeepLinkBubbleRow
            candidates={lensCandidates}
            onSelect={onLensSelect}
            disabled={lensDisabled}
            owner={lensOwner}
            className="mt-1.5"
          />
        ) : null}
      </PeerMessageRow>
    </Tag>
  );
}
