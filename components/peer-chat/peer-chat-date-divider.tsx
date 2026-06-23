"use client";

import { ChevronRight } from "lucide-react";
import { formatPeerChatDateDividerLabel } from "@/lib/peer-chat/peer-chat-date-divider";
import { cn } from "@/lib/utils";

type PeerChatDateDividerProps = {
  sentAt: string;
  locale?: string;
  className?: string;
};

/** 카톡식 날짜 구분 pill */
export function PeerChatDateDivider({
  sentAt,
  locale = "ko-KR",
  className,
}: PeerChatDateDividerProps) {
  const label = formatPeerChatDateDividerLabel(sentAt, locale);
  if (!label) {
    return null;
  }

  return (
    <li
      className={cn("flex justify-center py-2.5", className)}
      role="separator"
      aria-label={label}
      data-rimvio-chat-date-divider
    >
      <span className="inline-flex items-center gap-0.5 rounded-full bg-black/[0.06] px-3 py-1 text-[12px] font-medium leading-none text-[#6B6B6B]">
        {label}
        <ChevronRight className="size-3 shrink-0 opacity-45" aria-hidden />
      </span>
    </li>
  );
}
