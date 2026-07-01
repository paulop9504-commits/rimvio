"use client";

import { motion } from "framer-motion";
import { copy } from "@/lib/copy/human-ko";
import { globeChatLight } from "@/lib/design/globe-chat-light-theme";
import type { GlobeChatResourceCompleteMessage } from "@/lib/globe/chat/globe-chat-session-types";
import { cn } from "@/lib/utils";

export type GlobeChatCompletionCardProps = {
  message: GlobeChatResourceCompleteMessage;
  className?: string;
  onViewInnerGlobe?: () => void;
  onViewOuterGlobe?: () => void;
  tone?: "dark" | "light";
};

/** 등록 완료 확인 — 내 지구 / 외부 지구 분기. */
export function GlobeChatCompletionCard({
  message,
  className,
  onViewInnerGlobe,
  onViewOuterGlobe,
  tone = "dark",
}: GlobeChatCompletionCardProps) {
  const completion = copy.globe.chatCompletion;
  const light = tone === "light";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex max-w-[92%] flex-col gap-2.5 rounded-[1rem] rounded-bl-[0.35rem] px-3 py-3",
        light
          ? globeChatLight.cardSurface
          : "bg-[#121316]/92 ring-1 ring-white/14",
        className,
      )}
      data-globe-chat-completion-card
      data-resource-event-id={message.eventId}
    >
      <p
        className={cn(
          "text-[14px] font-semibold",
          light ? "text-[#191f28]" : "text-white",
        )}
      >
        {completion.title}
      </p>
      <p
        className={cn(
          "whitespace-pre-wrap text-[13px] leading-[1.55]",
          light ? "text-[#4e5968]" : "text-white/80",
        )}
      >
        {message.text}
      </p>

      <div
        className={cn(
          "flex flex-col gap-1 text-[12px]",
          light ? "text-[#8b95a1]" : "text-white/72",
        )}
      >
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
            className={cn(
              "w-full rounded-[0.75rem] py-2.5 text-[12px] font-semibold shadow-sm",
              light ? "bg-[#191f28] text-white" : "bg-white text-black",
            )}
          >
            {completion.viewInnerCta}
          </button>
        ) : null}
        {message.visibility.outerGlobe ? (
          <button
            type="button"
            onClick={onViewOuterGlobe}
            className={cn(
              "w-full rounded-[0.75rem] py-2 text-[11px] font-medium ring-1",
              light
                ? "bg-white text-[#191f28] ring-black/[0.08]"
                : "bg-white/8 text-white/88 ring-white/12",
            )}
          >
            {completion.viewOuterCta}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
