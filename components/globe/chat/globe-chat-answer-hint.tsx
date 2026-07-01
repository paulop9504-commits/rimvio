"use client";

import { GlobeActionPillGuide } from "@/components/globe/globe-action-pill-guide";
import type { GlobeChatActionHintPill } from "@/lib/portal/compose-draft/build-globe-chat-action-hint";
import { cn } from "@/lib/utils";

export type GlobeChatAnswerHintProps = {
  bodyKo: string;
  pills?: readonly GlobeChatActionHintPill[];
  onPillSelect?: (pill: GlobeChatActionHintPill) => void;
  className?: string;
  tone?: "dark" | "light";
};

/** Chat composer — “지금 할 일” card with optional tap-to-fill pills. */
export function GlobeChatAnswerHint({
  bodyKo,
  pills = [],
  onPillSelect,
  className,
  tone = "light",
}: GlobeChatAnswerHintProps) {
  const trimmed = bodyKo.trim();
  if (!trimmed && pills.length === 0) {
    return null;
  }
  if (pills.length > 0 && !onPillSelect) {
    return null;
  }

  return (
    <GlobeActionPillGuide
      bodyKo={trimmed}
      pills={pills}
      onPillSelect={onPillSelect!}
      variant="card"
      tone={tone}
      className={cn(className)}
    />
  );
}
