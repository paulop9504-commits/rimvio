"use client";

import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortalMarketSuggestion } from "@/lib/portal/resolve-portal-market-suggestion";

export type PortalMarketSuggestionCardProps = {
  suggestion: PortalMarketSuggestion;
  headline: string;
  body: string;
  cta: string;
  dismissAria: string;
  busy?: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  className?: string;
};

export function PortalMarketSuggestionCard({
  suggestion,
  headline,
  body,
  cta,
  dismissAria,
  busy = false,
  onAccept,
  onDismiss,
  className,
}: PortalMarketSuggestionCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#f0f6ff] to-white px-4 py-3.5 ring-1 ring-[#3182f6]/15",
        className,
      )}
      data-portal-market-suggestion={suggestion.kind}
      data-portal-market-role={suggestion.role}
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full text-[#8b95a1] active:bg-black/[0.04]"
        aria-label={dismissAria}
      >
        <X className="size-4" aria-hidden />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#3182f6]/10 text-[#3182f6]">
          <Sparkles className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-snug text-[#191f28]">{headline}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#6b7684]">{body}</p>
          <button
            type="button"
            disabled={busy}
            onClick={onAccept}
            className="mt-3 w-full rounded-xl bg-[#3182f6] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(49,130,246,0.28)] transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {cta}
          </button>
        </div>
      </div>
    </div>
  );
}
