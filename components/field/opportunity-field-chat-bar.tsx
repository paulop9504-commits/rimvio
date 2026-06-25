"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { MarketChatQuickReplyPills } from "@/components/market/market-chat-quick-reply-pills";
import { openMarketChatForListing } from "@/lib/globe/market/open-market-alignment-offer";
import { cn } from "@/lib/utils";

export type OpportunityFieldChatBarProps = {
  focusEventId: string;
  matchIntentId: string;
  quickReplies: string[];
  placeholder: string;
  bridgeFail: string;
  onBeforeNavigate?: () => void;
  navigate: (href: string) => void;
  className?: string;
};

export function OpportunityFieldChatBar({
  focusEventId,
  matchIntentId,
  quickReplies,
  placeholder,
  bridgeFail,
  onBeforeNavigate,
  navigate,
  className,
}: OpportunityFieldChatBarProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (body: string) => {
    const trimmed = body.trim();
    if (!trimmed || busy) {
      return;
    }
    setBusy(true);
    try {
      const threadId = await openMarketChatForListing({
        focusEventId,
        matchIntentId,
        initialMessage: trimmed,
        copy: { bridgeFail },
        navigate,
        onBeforeNavigate,
      });
      if (!threadId) {
        toast.error(bridgeFail);
      }
    } catch {
      toast.error(bridgeFail);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(text);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(text);
    }
  };

  const hasText = text.trim().length > 0;

  return (
    <div
      className={cn(
        "shrink-0 border-t border-[#f2f4f6] bg-[#f8f9fb]/95 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
      data-opportunity-field-chat-bar
    >
      <MarketChatQuickReplyPills
        replies={quickReplies}
        disabled={busy}
        onSelect={(reply) => void send(reply)}
      />
      <form onSubmit={onSubmit} className="flex items-end gap-2 px-3 pb-1">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          disabled={busy}
          enterKeyHint="send"
          autoComplete="off"
          placeholder={placeholder}
          className="max-h-24 min-h-[44px] flex-1 resize-none rounded-2xl border border-[#e5e8eb] bg-white px-4 py-2.5 text-[15px] text-[#191f28] placeholder:text-[#b0b8c1] focus:outline-none focus:ring-2 focus:ring-[#3182f6]/30 disabled:opacity-60"
        />
        {hasText ? (
          <button
            type="submit"
            disabled={busy}
            className="mb-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#3182f6] text-white disabled:opacity-50"
            aria-label="보내기"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ArrowUp className="size-[18px] stroke-[2.5]" aria-hidden />
            )}
          </button>
        ) : null}
      </form>
    </div>
  );
}
