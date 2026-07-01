"use client";

import { MessageCircle } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";

/** First-open chat — one line intent, no form dump. */
export function GlobeChatEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
      data-globe-chat-empty
    >
      <span className="mb-3.5 flex size-12 items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.05]">
        <MessageCircle className="size-5 text-[#4e5968]" aria-hidden />
      </span>
      <p className="text-[16px] font-semibold tracking-[-0.01em] text-[#191f28]">
        {copy.globe.chatEmptyTitle}
      </p>
      <p className="mt-2 max-w-[17rem] text-[13px] leading-[1.55] text-[#8b95a1]">
        {copy.globe.chatEmptyBody}
      </p>
    </div>
  );
}
