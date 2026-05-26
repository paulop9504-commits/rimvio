"use client";

import {
  type FeedCategoryFilter,
  FEED_CATEGORY_PILLS,
} from "@/lib/categories/types";
import { cn } from "@/lib/utils";

type FeedCategoryPillsProps = {
  value: FeedCategoryFilter;
  onChange: (value: FeedCategoryFilter) => void;
};

export function FeedCategoryPills({ value, onChange }: FeedCategoryPillsProps) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 top-2 z-30 px-5">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FEED_CATEGORY_PILLS.map((pill) => {
          const active = value === pill.value;

          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => onChange(pill.value)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium backdrop-blur-md transition-all",
                active
                  ? "bg-foreground/90 text-background shadow-sm"
                  : "bg-background/55 text-foreground/90 ring-1 ring-border/50 hover:bg-background/75"
              )}
            >
              {pill.emoji ? <span aria-hidden>{pill.emoji}</span> : null}
              <span>{pill.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
