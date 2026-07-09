"use client";

import { cn } from "@/lib/utils";

export type GlobeLodgingYouTubePreviewEmbedProps = {
  embedUrl: string;
  title?: string | null;
  isShort?: boolean;
  className?: string;
};

/** Muted autoplay Shorts / short-segment YouTube embed for lodging hero. */
export function GlobeLodgingYouTubePreviewEmbed({
  embedUrl,
  title,
  isShort = false,
  className,
}: GlobeLodgingYouTubePreviewEmbedProps) {
  return (
    <div
      className={cn("relative size-full overflow-hidden bg-black", className)}
      data-globe-lodging-youtube-preview
      data-lodging-youtube-short={isShort ? "1" : "0"}
    >
      <iframe
        title={title?.trim() || "숙소 미리보기"}
        src={embedUrl}
        className="absolute inset-0 size-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
