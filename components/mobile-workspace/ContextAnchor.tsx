"use client";

/**
 * Context Anchor chip — "📌 Namba Hotel 기준"
 */

import { cn } from "@/lib/utils";

export type ContextAnchorProps = {
  readonly titleKo: string;
  readonly onClear?: () => void;
  readonly className?: string;
};

export function ContextAnchor({
  titleKo,
  onClear,
  className,
}: ContextAnchorProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto inline-flex max-w-[min(92vw,340px)] items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 shadow-lg backdrop-blur-xl ring-1 ring-white/15",
        className,
      )}
      data-mobile-context-anchor
    >
      <span className="text-[12px]" aria-hidden>
        📌
      </span>
      <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white">
        {titleKo} 기준
      </p>
      {onClear ? (
        <button
          type="button"
          className="shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold text-white/70"
          onClick={onClear}
          aria-label="Clear anchor"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
