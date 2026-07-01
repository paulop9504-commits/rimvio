"use client";

import { MessageCircle } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";

/** First-open chat — one line intent, no form dump. */
export function GlobeChatEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-10 text-center"
      data-globe-chat-empty
    >
      <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-white/8 ring-1 ring-white/12">
        <MessageCircle className="size-5 text-white/70" aria-hidden />
      </span>
      <p className="text-[15px] font-semibold text-white/92">{copy.globe.chatEmptyTitle}</p>
      <p className="mt-1.5 max-w-[16rem] text-[13px] leading-relaxed text-white/50">
        {copy.globe.chatEmptyBody}
      </p>
    </div>
  );
}
