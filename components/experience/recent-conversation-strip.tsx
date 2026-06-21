"use client";

import type { ExperienceConversationProjection } from "@/lib/globe/experience-conversation-types";
import { MessageCircle } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type RecentConversationStripProps = {
  conversation: ExperienceConversationProjection;
  onOpenRoom: () => void;
  className?: string;
};

/** Recent talk previews — or empty CTA when thread exists but no messages yet. */
export function RecentConversationStrip({
  conversation,
  onOpenRoom,
  className,
}: RecentConversationStripProps) {
  if (conversation.previews.length === 0) {
    if (!conversation.peerThreadId?.trim()) {
      return null;
    }
    return (
      <button
        type="button"
        onClick={onOpenRoom}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl bg-muted/50 px-3.5 py-3 text-left active:bg-muted",
          className,
        )}
        data-recent-conversation-empty
      >
        <MessageCircle className="size-5 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-foreground">
            {copy.globe.bridgeContextTalkCta}
          </span>
          <span className="block text-[12px] text-muted-foreground">
            {copy.globe.bridgeContextTalkPreviewEmpty}
          </span>
        </span>
      </button>
    );
  }

  return (
    <section className={cn("space-y-2", className)} data-recent-conversation-strip>
      <p className="text-[12px] font-semibold text-muted-foreground">
        {copy.globe.bridgeContextTalkPreviewEyebrow}
      </p>
      <div className="rounded-xl border border-border bg-background">
        {conversation.previews.map((row, index) => (
          <button
            key={row.id}
            type="button"
            onClick={onOpenRoom}
            className={cn(
              "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left active:bg-foreground/[0.03]",
              index > 0 && "border-t border-border",
            )}
            data-conversation-preview={row.id}
          >
            <span className="text-[13px] font-semibold text-foreground">
              {row.speakerName}
            </span>
            <span className="text-[13px] leading-snug text-muted-foreground">
              &ldquo;{row.excerpt}&rdquo;
            </span>
          </button>
        ))}
        {conversation.overflowCount > 0 ? (
          <button
            type="button"
            onClick={onOpenRoom}
            className="w-full border-t border-border px-3 py-2.5 text-left text-[13px] font-medium text-muted-foreground active:bg-foreground/[0.03]"
            data-conversation-overflow
          >
            +{conversation.overflowCount}개 대화
          </button>
        ) : null}
      </div>
    </section>
  );
}
