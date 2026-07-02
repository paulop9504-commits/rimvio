"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import type { PeerChatLane } from "@/lib/peer-chat/peer-thread-lane";
import { cn } from "@/lib/utils";

const LANES: readonly PeerChatLane[] = [
  "all",
  "friend",
  "group",
  "context",
  "alignment",
  "ai",
] as const;

export type PeerChatLanePillsProps = {
  value: PeerChatLane;
  onChange: (lane: PeerChatLane) => void;
  counts?: Partial<Record<PeerChatLane, number>>;
  className?: string;
};

export function PeerChatLanePills({
  value,
  onChange,
  counts,
  className,
}: PeerChatLanePillsProps) {
  const copy = useCopy();
  const labels = copy.peers.friendRail.lanePills;

  return (
    <div
      className={cn(
        "shrink-0 border-b border-[#f2f4f6] bg-white/95 backdrop-blur-sm",
        className,
      )}
    >
      <div
        className="flex gap-2 overflow-x-auto px-4 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label={labels.ariaLabel}
      >
        {LANES.map((lane) => {
          const active = value === lane;
          const count = counts?.[lane];
          const label = labels[lane];
          const isAi = lane === "ai";

          return (
            <button
              key={lane}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(lane)}
              className={cn(
                "relative shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200",
                active
                  ? isAi
                    ? "text-white shadow-[0_4px_14px_rgba(49,130,246,0.35)]"
                    : "text-white shadow-[0_4px_14px_rgba(25,31,40,0.18)]"
                  : isAi
                    ? "bg-[#eef6ff] text-[#2563eb] active:scale-[0.97]"
                    : "bg-[#f2f4f6] text-[#4e5968] active:scale-[0.97]",
              )}
            >
              {active ? (
                <motion.span
                  layoutId={isAi ? "peer-chat-lane-pill-ai" : "peer-chat-lane-pill"}
                  className={cn(
                    "absolute inset-0 rounded-full",
                    isAi
                      ? "bg-gradient-to-b from-[#3b8bfd] to-[#2563eb]"
                      : "bg-[#191f28]",
                  )}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <span className="relative z-[1] flex items-center gap-1.5">
                {isAi ? <Sparkles className="size-3.5" aria-hidden /> : null}
                {label}
                {count != null && count > 0 && lane !== "all" ? (
                  <span
                    className={cn(
                      "min-w-[18px] rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums",
                      active ? "bg-white/20 text-white" : "bg-white text-[#3182f6]",
                    )}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
