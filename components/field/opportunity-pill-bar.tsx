"use client";

import { motion } from "framer-motion";
import { MarketIntentOwnershipChip } from "@/components/market/market-intent-ownership-chip";
import { cn } from "@/lib/utils";
import type { OpportunityPill } from "@/lib/globe/opportunity-field";

export type OpportunityPillBarProps = {
  pills: readonly OpportunityPill[];
  selectedContextId: string | null;
  onSelect: (contextId: string) => void;
  pillAria: (title: string, count: number) => string;
  minePillLabel: string;
  className?: string;
};

export function OpportunityPillBar({
  pills,
  selectedContextId,
  onSelect,
  pillAria,
  minePillLabel,
  className,
}: OpportunityPillBarProps) {
  if (pills.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "shrink-0 border-b border-[#f2f4f6] bg-white px-4 pb-3 pt-1",
        className,
      )}
    >
      <div
        className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
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
                "relative shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold transition-all duration-200 active:scale-[0.97]",
                active
                  ? "text-white shadow-[0_4px_14px_rgba(49,130,246,0.35)]"
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
              <span className="relative z-[1] flex items-center gap-1.5">
                <span
                  className={cn(
                    "rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                    active ? "bg-white/20 text-white" : "bg-[#3182f6]/10 text-[#3182f6]",
                  )}
                >
                  {minePillLabel}
                </span>
                {pill.title}
                <span
                  className={cn(
                    "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums leading-none",
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
