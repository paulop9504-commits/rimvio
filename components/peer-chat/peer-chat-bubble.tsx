"use client";

import type { PeerMessage } from "@/lib/context/peer-message-types";
import { DeepLinkBubbleRow } from "@/components/peer-chat/deep-link-bubble-row";
import { DM_CHAT } from "@/lib/peer-chat/dm-chat-density";
import { formatPeerMessageTime } from "@/lib/peer-chat/format-message-time";
import { PeerAiInlineCard } from "@/components/peer-chat/peer-ai-inline-card";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { PEER_MESSAGE_IMAGE_PLACEHOLDER } from "@/lib/peer-chat/peer-chat-image-constants";
import { cn } from "@/lib/utils";

type PeerChatBubbleProps = {
  message: PeerMessage;
  simple?: boolean;
  showTime?: boolean;
  /** 피드 타임라인 — ul/li 대신 div */
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
  as = "li",
  lensCandidates = [],
  onLensSelect,
  lensDisabled = false,
}: PeerChatBubbleProps) {
  const time =
    showTime && message.sentAt ? formatPeerMessageTime(message.sentAt) : "";

  const isMe = message.author === "me";

  const Tag = as;

  if (message.messageType === "ai_private" || message.messageType === "ai_shared") {
    return (
      <Tag className="flex w-full max-w-full justify-end">
        <div
          className={cn(
            "flex max-w-[94%] items-end",
            simple ? DM_CHAT.rowGap : "gap-1.5",
          )}
        >
          {time ? <MessageTime time={time} compact={simple} /> : null}
          <PeerAiInlineCard message={message} simple={simple} />
        </div>
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

  if (imageUrl) {
    return (
      <Tag
        className={cn(
          "flex w-full max-w-full flex-col",
          isMe ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "flex max-w-[94%] items-end",
            simple ? DM_CHAT.rowGap : "gap-1.5",
          )}
        >
          {time ? <MessageTime time={time} compact={simple} /> : null}
          <div
            className={cn(
              "min-w-0 overflow-hidden",
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
                    : cn(
                        "text-[15px]",
                        isMe ? "text-white" : "text-foreground",
                      ),
                  isMe && simple ? "bg-[#FEE500]" : !simple && isMe ? "bg-rimvio-neon-purple" : simple ? "bg-[#2c2c2e]" : "bg-rimvio-surface-raised",
                )}
              >
                {caption}
              </p>
            ) : null}
          </div>
        </div>
        {showLens ? (
          <DeepLinkBubbleRow
            candidates={lensCandidates}
            onSelect={onLensSelect}
            disabled={lensDisabled}
            className={cn("mt-1 max-w-[94%]", simple ? "pl-0" : "pl-1")}
          />
        ) : null}
      </Tag>
    );
  }

  return (
    <Tag
      className={cn(
        "flex w-full max-w-full flex-col",
        isMe ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "flex max-w-[94%] items-end",
          simple ? DM_CHAT.rowGap : "gap-1.5",
        )}
      >
        {time ? <MessageTime time={time} compact={simple} /> : null}
        <div
          className={cn(
            "min-w-0",
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
      </div>
      {showLens ? (
        <DeepLinkBubbleRow
          candidates={lensCandidates}
          onSelect={onLensSelect}
          disabled={lensDisabled}
          className={cn("mt-1 max-w-[94%]", simple ? "pl-0" : "pl-1")}
        />
      ) : null}
    </Tag>
  );
}
