"use client";

import { Play } from "lucide-react";
import { Shimmer } from "@/components/ui/shimmer";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import type { GlobeContextTriggerMediaPreview } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import { cn } from "@/lib/utils";

function TriggerMediaGridCell({
  media,
  className,
}: {
  media: GlobeContextTriggerMediaPreview;
  className?: string;
}) {
  const { url: blobUrl, loading } = useMediaBlobUrl(
    media.allowLocalBlob ? media.mediaContextId : null,
  );
  const src = media.imageUrl ?? blobUrl;

  if (loading && !src) {
    return <Shimmer className={cn("size-full rounded-[7px]", className)} aria-hidden />;
  }

  return (
    <span
      className={cn(
        "relative block size-full overflow-hidden rounded-[7px] bg-[#eef1f4]",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : null}
      {media.kind === "video" ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/18">
          <Play className="size-2.5 fill-white text-white" aria-hidden />
        </span>
      ) : null}
    </span>
  );
}

function TriggerMediaVideoHero({
  media,
  className,
}: {
  media: GlobeContextTriggerMediaPreview;
  className?: string;
}) {
  const { url: blobUrl, loading } = useMediaBlobUrl(
    media.allowLocalBlob ? media.mediaContextId : null,
  );
  const src = media.imageUrl ?? blobUrl;

  if (loading && !src) {
    return <Shimmer className={cn("size-full", className)} aria-hidden />;
  }

  return (
    <div className={cn("relative size-full overflow-hidden bg-[#eef1f4]", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center bg-black/12">
        <span className="flex size-10 items-center justify-center rounded-full bg-white/92 shadow-[0_4px_14px_rgba(15,23,42,0.14)]">
          <Play className="ml-0.5 size-4 fill-[#191f28] text-[#191f28]" aria-hidden />
        </span>
      </span>
    </div>
  );
}

function TriggerMediaPhotoGrid({
  items,
  className,
}: {
  items: readonly GlobeContextTriggerMediaPreview[];
  className?: string;
}) {
  const count = items.length;
  const cols = count <= 2 ? 2 : 3;
  const rows = count <= 2 ? 1 : 2;

  return (
    <div
      className={cn("grid size-full gap-1", className)}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {items.slice(0, cols * rows).map((item) => (
        <TriggerMediaGridCell key={item.id} media={item} />
      ))}
    </div>
  );
}

export type GlobeContextTriggerCardMediaPanelProps = {
  emoji: string;
  mediaPreviews?: readonly GlobeContextTriggerMediaPreview[];
  className?: string;
};

/** Top media zone — photo grid or video hero; emoji only when no media. */
export function GlobeContextTriggerCardMediaPanel({
  emoji,
  mediaPreviews,
  className,
}: GlobeContextTriggerCardMediaPanelProps) {
  const previews = mediaPreviews?.filter(Boolean) ?? [];
  const video = previews.find((row) => row.kind === "video");
  const photos = previews.filter((row) => row.kind !== "video");
  const visualItems = photos.length > 0 ? photos : previews;
  const showVideoHero =
    Boolean(video) && (visualItems.length <= 1 || previews.length === 1);

  return (
    <div
      className={cn(
        "relative h-[5.5rem] w-full overflow-hidden bg-[#f4f6f8]",
        className,
      )}
      data-globe-context-trigger-card-media-panel
      aria-hidden
    >
      {showVideoHero && video ? (
        <TriggerMediaVideoHero media={video} />
      ) : visualItems.length >= 2 ? (
        <div className="flex h-full items-center justify-center p-2.5">
          <div className="aspect-[3/2] h-full max-h-full w-full">
            <TriggerMediaPhotoGrid items={visualItems} />
          </div>
        </div>
      ) : visualItems.length === 1 ? (
        <div className="p-2.5">
          <TriggerMediaGridCell media={visualItems[0]!} className="size-full min-h-[4.25rem]" />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <span className="flex size-14 items-center justify-center rounded-[16px] bg-white text-[2rem] leading-none shadow-[0_2px_10px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]">
            {emoji}
          </span>
        </div>
      )}
    </div>
  );
}
