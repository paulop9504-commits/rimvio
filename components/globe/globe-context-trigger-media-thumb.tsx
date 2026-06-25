"use client";

import { Play } from "lucide-react";
import { Shimmer } from "@/components/ui/shimmer";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import type { GlobeContextTriggerMediaPreview } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import { cn } from "@/lib/utils";

export function GlobeContextTriggerMediaThumb({
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
    return (
      <Shimmer
        className={cn("size-9 rounded-full ring-2 ring-white", className)}
        aria-hidden
      />
    );
  }

  if (!src) {
    return (
      <div
        className={cn(
          "size-9 rounded-full bg-muted ring-2 ring-white",
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <span className={cn("relative block size-9 shrink-0", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="size-9 rounded-full object-cover ring-2 ring-white"
        loading="lazy"
        decoding="async"
      />
      {media.kind === "video" ? (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/25">
          <Play className="size-3 fill-white text-white" aria-hidden />
        </span>
      ) : null}
    </span>
  );
}
