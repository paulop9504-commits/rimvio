"use client";

import { useEffect, useRef } from "react";

export type GlobeBrainSurfaceYoutubeEmbedProps = {
  videoKey: string;
  embedSrc: string;
  title: string;
  className?: string;
};

/** Locks iframe src after first mount so parent re-renders do not restart playback. */
export function GlobeBrainSurfaceYoutubeEmbed({
  videoKey,
  embedSrc,
  title,
  className = "aspect-video w-full border-0",
}: GlobeBrainSurfaceYoutubeEmbedProps) {
  const lockedKeyRef = useRef<string | null>(null);
  const lockedSrcRef = useRef<string | null>(null);

  if (lockedKeyRef.current !== videoKey) {
    lockedKeyRef.current = videoKey;
    lockedSrcRef.current = embedSrc;
  } else if (!lockedSrcRef.current) {
    lockedSrcRef.current = embedSrc;
  }

  useEffect(() => {
    lockedKeyRef.current = videoKey;
    lockedSrcRef.current = embedSrc;
  }, [embedSrc, videoKey]);

  const src = lockedSrcRef.current;
  if (!src) {
    return null;
  }

  return (
    <iframe
      key={videoKey}
      src={src}
      title={title}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      className={className}
    />
  );
}
