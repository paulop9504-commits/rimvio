"use client";

import { motion } from "framer-motion";
import { copy } from "@/lib/copy/human-ko";
import type { GlobeChatResourceCompleteMessage } from "@/lib/globe/chat/globe-chat-session-types";
import { cn } from "@/lib/utils";

export type GlobeChatCompletionCardProps = {
  message: GlobeChatResourceCompleteMessage;
  className?: string;
  onViewInnerGlobe?: () => void;
  onViewOuterGlobe?: () => void;
};

/** 등록 완료 확인 — 내 지구 / 외부 지구 분기. */
export function GlobeChatCompletionCard({
  message,
  className,
  onViewInnerGlobe,
  onViewOuterGlobe,
}: GlobeChatCompletionCardProps) {
  const completion = copy.globe.chatCompletion;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex max-w-[92%] flex-col gap-2.5 rounded-[1rem] rounded-bl-md bg-[#121316]/92 px-3 py-3 ring-1 ring-white/14",
        className,
      )}
      data-globe-chat-completion-card
      data-resource-event-id={message.eventId}
    >
      <p className="text-[13px] font-semibold text-white">{completion.title}</p>
      <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-white/80">
        {message.text}
      </p>

      <div className="flex flex-col gap-1 text-[11px] text-white/72">
        {message.visibility.innerGlobe ? (
          <span>{completion.innerGlobeLine}</span>
        ) : null}
        {message.visibility.outerGlobe ? (
          <span>{completion.outerGlobeLine}</span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5 pt-0.5">
        {message.visibility.innerGlobe ? (
          <button
            type="button"
            onClick={onViewInnerGlobe}
            className="w-full rounded-[0.75rem] bg-white py-2.5 text-[12px] font-semibold text-black shadow-sm"
          >
            {completion.viewInnerCta}
          </button>
        ) : null}
        {message.visibility.outerGlobe ? (
          <button
            type="button"
            onClick={onViewOuterGlobe}
            className="w-full rounded-[0.75rem] bg-white/8 py-2 text-[11px] font-medium text-white/88 ring-1 ring-white/12"
          >
            {completion.viewOuterCta}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
