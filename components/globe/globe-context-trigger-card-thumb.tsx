"use client";

import { Play } from "lucide-react";
import { Shimmer } from "@/components/ui/shimmer";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import type { GlobeContextTriggerMediaPreview } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import { cn } from "@/lib/utils";

/** Square card icon — Toss-style trigger tile header. */
export function GlobeContextTriggerCardThumb({
  emoji,
  media,
  className,
}: {
  emoji: string;
  media?: GlobeContextTriggerMediaPreview;
  className?: string;
}) {
  const { url: blobUrl, loading } = useMediaBlobUrl(
    media?.allowLocalBlob ? media.mediaContextId : null,
  );
  const src = media?.imageUrl ?? blobUrl;

  if (media && loading && !src) {
    return (
      <Shimmer
        className={cn("size-11 rounded-[12px]", className)}
        aria-hidden
      />
    );
  }

  if (src) {
    return (
      <span className={cn("relative block size-11 shrink-0", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="size-11 rounded-[12px] object-cover"
          loading="lazy"
          decoding="async"
        />
        {media?.kind === "video" ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-[12px] bg-black/20">
            <Play className="size-3.5 fill-white text-white" aria-hidden />
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[#f2f4f6] text-[1.35rem] leading-none",
        className,
      )}
      aria-hidden
    >
      {emoji}
    </span>
  );
}
