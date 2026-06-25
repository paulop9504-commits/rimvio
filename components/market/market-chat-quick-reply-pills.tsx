"use client";

import { cn } from "@/lib/utils";

export type MarketChatQuickReplyPillsProps = {
  replies: string[];
  disabled?: boolean;
  onSelect: (text: string) => void;
  className?: string;
};

/** Karrot-style horizontal opener pills above marketplace DM composer. */
export function MarketChatQuickReplyPills({
  replies,
  disabled = false,
  onSelect,
  className,
}: MarketChatQuickReplyPillsProps) {
  if (replies.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      data-market-chat-quick-replies
    >
      {replies.map((reply) => (
        <button
          key={reply}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(reply)}
          className="shrink-0 rounded-full border border-[#e5e8eb] bg-white px-3.5 py-2 text-[14px] font-medium text-[#191f28] shadow-sm transition-colors active:bg-[#f2f4f6] disabled:opacity-50"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
