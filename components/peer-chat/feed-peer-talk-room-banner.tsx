"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import {
  notifyPeerRoomFromFeed,
  peerRoomPath,
} from "@/lib/peer-chat/navigate-peer-room-from-feed";
import { cn } from "@/lib/utils";

type FeedPeerTalkRoomBannerProps = {
  peerThreadId: string;
  displayName: string;
  className?: string;
};

/** 피드 @톡 인라인 DM → 친구 ROOM(렌즈·실행) 안내 */
export function FeedPeerTalkRoomBanner({
  peerThreadId,
  displayName,
  className,
}: FeedPeerTalkRoomBannerProps) {
  const copy = useCopy();
  const router = useRouter();

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-rimvio-neon-cyan/25 bg-rimvio-neon-cyan/8 px-3 py-2",
        className,
      )}
    >
      <p className="min-w-0 flex-1 text-[11px] leading-snug text-white/65">
        {copy.product.feedPeerTalkRoomHint}
      </p>
      <button
        type="button"
        className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-rimvio-neon-cyan"
        onClick={() => {
          notifyPeerRoomFromFeed(displayName);
          router.push(peerRoomPath(peerThreadId));
        }}
      >
        {copy.product.feedPeerTalkRoomLink}
        <ChevronRight className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
