"use client";

import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeChatAnswerHintProps = {
  questionKo: string;
  className?: string;
  tone?: "dark" | "light";
};

/** Current AI question — pinned above input so users know what to answer. */
export function GlobeChatAnswerHint({
  questionKo,
  className,
  tone = "light",
}: GlobeChatAnswerHintProps) {
  const trimmed = questionKo.trim();
  if (!trimmed) {
    return null;
  }

  const isLight = tone === "light";

  return (
    <div className={className} data-globe-chat-answer-hint>
      <p
        className={cn(
          "mb-1 text-[10px] font-semibold uppercase tracking-wide",
          isLight ? "text-[#8b95a1]" : "text-white/40",
        )}
      >
        {copy.globe.chatWaitingLabel}
      </p>
      <p
        className={cn(
          "line-clamp-3 text-[13px] leading-snug",
          isLight ? "text-[#191f28]" : "text-white/88",
        )}
      >
        {trimmed}
      </p>
    </div>
  );
}
