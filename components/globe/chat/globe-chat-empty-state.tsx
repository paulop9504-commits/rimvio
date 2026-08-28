"use client";

import { MessageCircle } from "lucide-react";
import {
  GlobeActionPillGuide,
  readPillSubmitText,
} from "@/components/globe/globe-action-pill-guide";
import { copy } from "@/lib/copy/human-ko";

export type GlobeChatEmptyStateProps = {
  onPillSelect?: (text: string) => void;
  title?: string;
  body?: string;
};

/** First-open chat — one line intent + starter pills. */
export function GlobeChatEmptyState({
  onPillSelect,
  title,
  body,
}: GlobeChatEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-8 text-center"
      data-globe-chat-empty
    >
      <span className="mb-2.5 flex size-10 items-center justify-center rounded-full bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.05]">
        <MessageCircle className="size-[18px] text-[#4e5968]" aria-hidden />
      </span>
      <p className="text-[15px] font-semibold tracking-[-0.01em] text-[#191f28]">
        {title ?? copy.globe.chatEmptyTitle}
      </p>
      <p className="mt-1 max-w-[16rem] text-[12px] leading-[1.4] text-[#8b95a1]">
        {body ?? copy.globe.chatEmptyBody}
      </p>
      {onPillSelect ? (
        <GlobeActionPillGuide
          pills={copy.globe.chatActionPills.chatting}
          variant="inline"
          showLabel={false}
          tone="light"
          className="mt-2.5 w-full max-w-[19rem]"
          onPillSelect={(pill) => onPillSelect(readPillSubmitText(pill))}
        />
      ) : null}
    </div>
  );
}
