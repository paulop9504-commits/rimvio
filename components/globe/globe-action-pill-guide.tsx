"use client";

import { GlobeChatSlotChips } from "@/components/globe/chat/globe-chat-slot-chips";
import type { GlobeChatActionHintPill } from "@/lib/portal/compose-draft/build-globe-chat-action-hint";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeActionPillGuideProps = {
  bodyKo?: string | null;
  pills: readonly GlobeChatActionHintPill[];
  onPillSelect: (pill: GlobeChatActionHintPill) => void;
  /** card = “지금 할 일” panel; inline = map / empty state row */
  variant?: "card" | "inline";
  showLabel?: boolean;
  className?: string;
  tone?: "dark" | "light";
  chipVariant?: "confirm" | "slot" | "category";
};

/** Tap-to-submit example pills — shared across chat, map prompt, empty states. */
export function GlobeActionPillGuide({
  bodyKo,
  pills,
  onPillSelect,
  variant = "card",
  showLabel = true,
  className,
  tone = "light",
  chipVariant = "confirm",
}: GlobeActionPillGuideProps) {
  const trimmedBody = bodyKo?.trim() ?? "";
  if (pills.length === 0 && !trimmedBody) {
    return null;
  }

  const isLight = tone === "light";
  const inline = variant === "inline";
  const pillSize = inline && tone === "dark" ? "map" : "action";

  return (
    <div
      className={cn(inline ? "flex flex-col items-center gap-1" : "flex flex-col", className)}
      data-globe-action-pill-guide
      data-variant={variant}
    >
      {showLabel && !inline ? (
        <p
          className={cn(
            "mb-0.5 text-[10px] font-semibold uppercase tracking-wide",
            isLight ? "text-[#8b95a1]" : "text-white/45",
          )}
        >
          {copy.globe.chatWaitingLabel}
        </p>
      ) : null}
      {trimmedBody ? (
        <p
          className={cn(
            inline ? "text-center text-[12px] leading-[1.35]" : "text-[12px] leading-[1.35]",
            pills.length > 0 ? "mb-1" : "mb-0",
            inline
              ? isLight
                ? "text-[#8b95a1]"
                : "text-white/55"
              : isLight
                ? "text-[#4e5968]"
                : "text-white/80",
          )}
        >
          {trimmedBody}
        </p>
      ) : null}
      {pills.length > 0 ? (
        <GlobeChatSlotChips
          choices={pills}
          variant={chipVariant}
          tone={tone}
          size={pillSize}
          layout={inline && tone === "dark" ? "scroll" : "wrap"}
          className={cn(
            inline ? (tone === "dark" ? "w-full max-w-full px-0.5" : "justify-center") : "mt-0",
          )}
          onSelect={(choice) => onPillSelect(choice)}
        />
      ) : null}
    </div>
  );
}

export function readPillSubmitText(pill: GlobeChatActionHintPill): string {
  return pill.submitKo?.trim() || pill.labelKo.trim();
}
