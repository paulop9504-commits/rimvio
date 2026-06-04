"use client";

import type { PeerMessage } from "@/lib/context/peer-message-types";
import { DM_CHAT } from "@/lib/peer-chat/dm-chat-density";
import { formatPeerMessageTime } from "@/lib/peer-chat/format-message-time";
import { PeerAiInlineCard } from "@/components/peer-chat/peer-ai-inline-card";
import { cn } from "@/lib/utils";

type PeerChatBubbleProps = {
  message: PeerMessage;
  simple?: boolean;
  showTime?: boolean;
  /** 피드 타임라인 — ul/li 대신 div */
  as?: "li" | "div";
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

  return (
    <Tag className={cn("flex w-full max-w-full", isMe ? "justify-end" : "justify-start")}>
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
    </Tag>
  );
}
