"use client";

import { cn } from "@/lib/utils";
import {
  CATEGORY_PILLS,
  type InboxFilterValue,
} from "@/lib/categories/types";

type InboxFilterProps = {
  value: InboxFilterValue;
  onChange: (value: InboxFilterValue) => void;
  counts: Partial<Record<InboxFilterValue, number>>;
};

export function InboxFilter({ value, onChange, counts }: InboxFilterProps) {
  return (
    <div className="-mx-5 mb-4 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-2">
        {CATEGORY_PILLS.map((pill) => {
          const active = value === pill.value;
          const count = counts[pill.value] ?? 0;

          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => onChange(pill.value)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
                "border backdrop-blur-md",
                active
                  ? "border-foreground/15 bg-foreground text-background shadow-sm"
                  : "border-border/60 bg-background/70 text-foreground hover:bg-secondary/60"
              )}
            >
              {pill.emoji ? <span aria-hidden>{pill.emoji}</span> : null}
              <span>{pill.label}</span>
              {pill.value !== "all" && count > 0 ? (
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    active ? "text-background/75" : "text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
