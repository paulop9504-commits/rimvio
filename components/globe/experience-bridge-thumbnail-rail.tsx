"use client";

import { Shimmer } from "@/components/ui/shimmer";
import { isOwnBridgeReelItem } from "@/lib/globe/is-own-bridge-reel-item";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type ExperienceBridgeThumbnailRailProps = {
  items: readonly ContextMediaReelItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  viewerUserId?: string | null;
  variant?: "light" | "dark";
  className?: string;
};

function thumbSrc(item: ContextMediaReelItem): string | null {
  return item.imageUrl?.trim() || null;
}

/** Horizontal filmstrip — mine vs friend like Kakao media thread. */
export function ExperienceBridgeThumbnailRail({
  items,
  activeIndex,
  onSelect,
  viewerUserId,
  variant = "light",
  className,
}: ExperienceBridgeThumbnailRailProps) {
  const dark = variant === "dark";
  if (items.length < 2) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      data-experience-bridge-thumbnail-rail
    >
      {items.map((item, index) => {
        const src = thumbSrc(item);
        const active = index === activeIndex;
        const mine = isOwnBridgeReelItem({ item, viewerUserId });
        const aria = mine
          ? copy.globe.bridgeMediaThumbMineAria
          : copy.globe.bridgeMediaThumbFriendAria;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(index)}
            className={cn(
              "relative h-12 w-9 shrink-0 overflow-hidden rounded-md transition",
              active
                ? "scale-105 ring-2"
                : "opacity-80 ring-1 hover:opacity-100",
              active && mine && (dark ? "ring-[#0071e3]" : "ring-[#0071e3]"),
              active && !mine && (dark ? "ring-white/70" : "ring-foreground/40"),
              !active && mine && "ring-[#0071e3]/40",
              !active && !mine && (dark ? "ring-white/20" : "ring-border"),
            )}
            aria-label={`${index + 1}번째 · ${aria}`}
            aria-current={active ? "true" : undefined}
            data-bridge-thumb-owner={mine ? "mine" : "friend"}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                className="size-full object-cover brightness-[1.03] saturate-[1.06]"
                loading="lazy"
              />
            ) : item.pendingRemote ? (
              <Shimmer className="size-full rounded-none" />
            ) : (
              <span className="flex size-full items-center justify-center bg-gradient-to-br from-primary/30 to-violet-500/25 text-[9px] font-bold text-white/80">
                {item.kind === "video" ? "▶" : "◆"}
              </span>
            )}
            {item.kind === "video" && src ? (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 text-[10px] text-white">
                ▶
              </span>
            ) : null}
            <span
              className={cn(
                "pointer-events-none absolute bottom-0.5 left-0.5 size-1.5 rounded-full",
                mine ? "bg-[#0071e3]" : "bg-white/90",
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
