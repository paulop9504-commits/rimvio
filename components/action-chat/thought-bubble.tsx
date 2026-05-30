"use client";

import { cn } from "@/lib/utils";

type ThoughtBubbleProps = {
  text: string;
  className?: string;
};

export function ThoughtBubble({ text, className }: ThoughtBubbleProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#E8ECF1] bg-gradient-to-br from-[#F8FAFC] to-[#F3F6FA] px-3 py-2.5",
        className
      )}
    >
      <p className="text-[12px] leading-relaxed text-[#64748B]">
        <span aria-hidden className="mr-1">
          💡
        </span>
        {text}
      </p>
    </div>
  );
}
