"use client";

import { copy } from "@/lib/copy/human-ko";

export type GlobeChatAnswerHintProps = {
  questionKo: string;
  className?: string;
};

/** Current AI question — pinned above input so users know what to answer. */
export function GlobeChatAnswerHint({ questionKo, className }: GlobeChatAnswerHintProps) {
  const trimmed = questionKo.trim();
  if (!trimmed) {
    return null;
  }

  return (
    <div
      className={className}
      data-globe-chat-answer-hint
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/40">
        {copy.globe.chatWaitingLabel}
      </p>
      <p className="line-clamp-2 text-[13px] leading-snug text-white/88">{trimmed}</p>
    </div>
  );
}
