"use client";

import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import { isOwnBridgeReelItem } from "@/lib/globe/is-own-bridge-reel-item";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type BridgeMediaExchangeChipProps = {
  item: ContextMediaReelItem;
  viewerUserId?: string | null;
  selfDisplayName?: string | null;
  className?: string;
};

/** Minimal sender label — mine right, friend left. */
export function BridgeMediaExchangeChip({
  item,
  viewerUserId,
  selfDisplayName,
  className,
}: BridgeMediaExchangeChipProps) {
  const mine = isOwnBridgeReelItem({ item, viewerUserId });
  const displayName =
    item.authorDisplayName?.trim() ||
    (mine ? selfDisplayName?.trim() || "나" : copy.globe.bridgeInviteHostFallback);

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-2 z-[5] max-w-[70%]",
        mine ? "right-2 text-right" : "left-2 text-left",
        className,
      )}
      data-bridge-media-exchange={mine ? "mine" : "friend"}
    >
      <span
        className={cn(
          "inline-block truncate rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md",
          mine
            ? "bg-[#0071e3]/88 text-white"
            : "bg-black/45 text-white/95",
        )}
      >
        {mine
          ? copy.globe.bridgeMediaMineLabel
          : copy.globe.bridgeMediaFriendLabel(displayName)}
      </span>
    </div>
  );
}
