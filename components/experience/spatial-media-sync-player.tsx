"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { SpacetimePingCard } from "@/components/experience/spacetime-ping-card";
import { SpatialGlobeStage } from "@/components/experience/spatial-globe-stage";
import {
  useSpatialContextSync,
  type SpatialContextSyncState,
} from "@/hooks/use-spatial-context-sync";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { projectVolumeSpatialMedia } from "@/lib/experience-graph/project-volume-spatial-media";
import { MEDIA_SPACETIME_UPDATED } from "@/lib/location-ping/media-context-store";
import type { SpatialMediaKind, SpatialMediaItem } from "@/lib/experience-graph/spatial-media-types";
import { cn } from "@/lib/utils";

const KIND_META: Record<
  SpatialMediaKind,
  { emoji: string; label: string; previewClass: string }
> = {
  photo: {
    emoji: "📷",
    label: "사진",
    previewClass: "from-emerald-500/20 to-teal-900/30",
  },
  video: {
    emoji: "🎬",
    label: "영상",
    previewClass: "from-violet-500/20 to-indigo-900/30",
  },
  text: {
    emoji: "✍️",
    label: "글",
    previewClass: "from-amber-500/15 to-orange-900/25",
  },
  other: {
    emoji: "🧭",
    label: "기타",
    previewClass: "from-sky-500/15 to-slate-900/30",
  },
};

export type SpatialMediaSyncPlayerProps = {
  volume?: ExperienceVolume;
  items?: readonly SpatialMediaItem[];
  sync?: SpatialContextSyncState;
  hideGlobe?: boolean;
  className?: string;
};

/**
 * Tap photo/video/text → globe position, time ribbon, and environment update together.
 */
export const SpatialMediaSyncPlayer = memo(function SpatialMediaSyncPlayer({
  volume,
  items: itemsProp,
  sync: syncProp,
  hideGlobe = false,
  className,
}: SpatialMediaSyncPlayerProps) {
  const [uploadedMediaTick, setUploadedMediaTick] = useState(0);

  useEffect(() => {
    const onUpdated = () => setUploadedMediaTick((tick) => tick + 1);
    window.addEventListener(MEDIA_SPACETIME_UPDATED, onUpdated);
    return () => window.removeEventListener(MEDIA_SPACETIME_UPDATED, onUpdated);
  }, []);

  const items = useMemo(
    () => itemsProp ?? (volume ? projectVolumeSpatialMedia(volume) : []),
    [itemsProp, volume, uploadedMediaTick],
  );
  const internalSync = useSpatialContextSync(items);
  const sync = syncProp ?? internalSync;

  return (
    <div
      className={cn("space-y-3", className)}
      data-spatial-media-sync-player
      data-experience-volume-id={volume?.id}
      data-spatial-selected-id={sync.selectedId ?? undefined}
    >
      {!hideGlobe && sync.globe && sync.frame ? (
        <SpatialGlobeStage
          globe={sync.globe}
          timeLabel={sync.frame.timeLabel}
          environmentLabel={sync.frame.environmentLabel}
        />
      ) : null}

      {sync.selectedItem ? (
        <SpacetimePingCard item={sync.selectedItem} volume={volume} />
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {sync.items.map((item) => {
          const meta = KIND_META[item.kind];
          const active = item.id === sync.selectedId;
          return (
            <button
              key={item.id}
              type="button"
              data-spatial-media-id={item.id}
              data-spatial-media-kind={item.kind}
              aria-pressed={active}
              onClick={() => sync.selectItem(item.id)}
              className={cn(
                "w-[88px] shrink-0 rounded-xl border p-2 text-left transition-all duration-300",
                active
                  ? "border-sky-300/50 bg-sky-500/15 shadow-[0_0_0_1px_rgba(125,211,252,0.25)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20",
              )}
            >
              <div
                className={cn(
                  "flex h-14 items-center justify-center rounded-lg bg-gradient-to-br text-lg",
                  meta.previewClass,
                )}
              >
                {meta.emoji}
              </div>
              <p className="mt-1.5 line-clamp-2 text-[10px] font-semibold leading-tight text-white/88">
                {item.title}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
});
