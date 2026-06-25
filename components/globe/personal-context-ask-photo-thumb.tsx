"use client";

import { Shimmer } from "@/components/ui/shimmer";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import type { PersonalContextPhotoPreview } from "@/lib/personal-context-ask";
import { cn } from "@/lib/utils";

export function PersonalContextAskPhotoThumb({
  photo,
  className,
}: {
  photo: PersonalContextPhotoPreview;
  className?: string;
}) {
  const { url: blobUrl, loading } = useMediaBlobUrl(
    photo.allowLocalBlob ? photo.mediaContextId : null,
  );
  const src = photo.imageUrl ?? blobUrl;

  if (loading && !src) {
    return <Shimmer className={cn("aspect-square w-full rounded-xl", className)} />;
  }

  if (!src) {
    return (
      <div
        className={cn(
          "aspect-square w-full rounded-xl bg-[#e5e8eb]",
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={cn(
        "aspect-square w-full rounded-xl object-cover ring-1 ring-black/[0.04]",
        className,
      )}
      loading="lazy"
      decoding="async"
    />
  );
}
