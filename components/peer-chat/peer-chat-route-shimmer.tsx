"use client";

import { Shimmer } from "@/components/ui/shimmer";
import { DM_CHAT } from "@/lib/peer-chat/dm-chat-density";
import { cn } from "@/lib/utils";

type PeerChatRouteShimmerProps = {
  variant?: "hub" | "thread";
  className?: string;
};

/** Shimmer fallback for peer chat routes — no spinners, no blank Suspense. */
export function PeerChatRouteShimmer({
  variant = "hub",
  className,
}: PeerChatRouteShimmerProps) {
  if (variant === "thread") {
    return (
      <div
        className={cn("flex min-h-0 flex-1 flex-col bg-background", className)}
        aria-busy
        aria-label="대화 불러오는 중"
      >
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border/80 px-3 pt-[env(safe-area-inset-top,0px)]">
          <Shimmer className="size-9 rounded-full" />
          <Shimmer className="h-4 w-28 rounded-full" />
        </div>
        <div className={cn("min-h-0 flex-1 px-3 py-3", DM_CHAT.listGap, "flex flex-col")}>
          <Shimmer className="h-[31px] w-[42%] rounded-[18px]" />
          <Shimmer className="ml-auto h-[31px] w-[34%] rounded-[18px]" />
          <Shimmer className="h-[31px] w-[52%] rounded-[18px]" />
        </div>
        <div className="shrink-0 px-2 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1">
          <Shimmer className="h-11 w-full rounded-[22px]" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-2 px-3 py-3", className)} aria-busy>
      <Shimmer className="h-10 w-full rounded-2xl" />
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 py-2">
          <Shimmer className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Shimmer className="h-3.5 w-[38%] rounded-full" />
            <Shimmer className="h-3 w-[62%] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
