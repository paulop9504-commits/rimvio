"use client";

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

/** GPT-style empty — ask first, no dashboard chrome. */
export function GlobeChatEmptyState({
  onPillSelect,
  title,
  body,
}: GlobeChatEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-12 text-center"
      data-globe-chat-empty
    >
      <p className="text-[26px] font-semibold tracking-[-0.04em] text-[#0d0d0d]">
        {title ?? copy.globe.chatEmptyTitle}
      </p>
      <p className="mt-2 max-w-[20rem] text-[15px] leading-relaxed text-[#5d5d5d]">
        {body ?? copy.globe.chatEmptyBody}
      </p>
      {onPillSelect ? (
        <GlobeActionPillGuide
          pills={copy.globe.chatActionPills.chatting}
          variant="inline"
          showLabel={false}
          tone="light"
          className="mt-5 w-full max-w-[22rem]"
          onPillSelect={(pill) => onPillSelect(readPillSubmitText(pill))}
        />
      ) : null}
    </div>
  );
}
