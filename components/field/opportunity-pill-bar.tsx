"use client";

import { motion } from "framer-motion";
import { MarketIntentOwnershipChip } from "@/components/market/market-intent-ownership-chip";
import { cn } from "@/lib/utils";
import type { OpportunityPill } from "@/lib/globe/opportunity-field";

export type OpportunityPillBarProps = {
  pills: readonly OpportunityPill[];
  selectedContextId: string | null;
  onSelect: (contextId: string | null) => void;
  pillAria: (title: string, count: number) => string;
  minePillLabel: string;
  browseAllLabel: string;
  className?: string;
};

export function OpportunityPillBar({
  pills,
  selectedContextId,
  onSelect,
  pillAria,
  minePillLabel,
  browseAllLabel,
  className,
}: OpportunityPillBarProps) {
  if (pills.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "shrink-0 border-b border-[#f2f4f6] bg-white px-5 pb-2.5 pt-1.5",
        className,
      )}
    >
      <div
        className="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedContextId == null}
          onClick={() => onSelect(null)}
          className={cn(
            "relative shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 active:scale-[0.97]",
            selectedContextId == null
              ? "text-white shadow-[0_2px_8px_rgba(49,130,246,0.28)]"
              : "bg-[#f2f4f6] text-[#4e5968]",
          )}
        >
          {selectedContextId == null ? (
            <motion.span
              layoutId="opportunity-pill-active"
              className="absolute inset-0 rounded-full bg-[#3182f6]"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          ) : null}
          <span className="relative z-[1]">{browseAllLabel}</span>
        </button>
        {pills.map((pill) => {
          const active = pill.contextId === selectedContextId;
          return (
            <button
              key={pill.contextId}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={pillAria(pill.title, pill.count)}
              onClick={() => onSelect(pill.contextId)}
              className={cn(
                "relative shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 active:scale-[0.97]",
                active
                  ? "text-white shadow-[0_2px_8px_rgba(49,130,246,0.28)]"
                  : "bg-[#f2f4f6] text-[#4e5968]",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="opportunity-pill-active"
                  className="absolute inset-0 rounded-full bg-[#3182f6]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <span className="relative z-[1] flex items-center gap-1">
                <span
                  className={cn(
                    "rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide",
                    active ? "bg-white/20 text-white" : "bg-[#3182f6]/10 text-[#3182f6]",
                  )}
                >
                  {minePillLabel}
                </span>
                {pill.title}
                <span
                  className={cn(
                    "min-w-[1.125rem] rounded-full px-1 py-px text-[10px] font-bold tabular-nums leading-none",
                    active ? "bg-white/20 text-white" : "bg-white text-[#3182f6]",
                  )}
                >
                  {pill.count}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
