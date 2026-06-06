"use client";

import { memo } from "react";
import { SpatialMediaSyncPlayer } from "@/components/experience/spatial-media-sync-player";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { cn } from "@/lib/utils";

export type FeedExperienceSyncSheetProps = {
  open: boolean;
  volume: ExperienceVolume | null;
  onClose: () => void;
  className?: string;
};

/** Fullscreen-adjacent sheet — spatial sync player for a feed volume. */
export const FeedExperienceSyncSheet = memo(function FeedExperienceSyncSheet({
  open,
  volume,
  onClose,
  className,
}: FeedExperienceSyncSheetProps) {
  if (!open || !volume) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm",
        className,
      )}
      data-feed-experience-sync-sheet
      role="dialog"
      aria-modal="true"
      aria-label="이 맥락의 공간·시간 기억"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0c0f16] px-4 pb-8 pt-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-white/40">이 맥락의 기억</p>
            <h2 className="truncate text-[16px] font-semibold text-white">{volume.title}</h2>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/85"
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        <p className="mb-3 text-[12px] leading-snug text-white/50">
          그때 어디에 있었는지, 어떻게 움직였는지 — 사진·영상·글과 함께 떠올려 보세요.
        </p>

        <SpatialMediaSyncPlayer volume={volume} />
      </div>
    </div>
  );
});
