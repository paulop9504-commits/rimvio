"use client";

import { GlobeMapFocusMediaShell } from "@/components/globe/globe-map-focus-media-shell";
import {
  GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS,
} from "@/lib/globe/globe-map-focus-hero-layout";
import { cn } from "@/lib/utils";

export function buildBrainSurfaceEmbedSrc(
  embedUrl: string | null | undefined,
): string | null {
  const raw = embedUrl?.trim();
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    url.searchParams.set("autoplay", "1");
    url.searchParams.set("mute", "0");
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("rel", "0");
    url.searchParams.set("enablejsapi", "1");
    return url.toString();
  } catch {
    return raw;
  }
}

export type GlobeBrainSurfaceVideoChipProps = {
  embedSrc: string;
  embedKey: string;
  title: string;
  caption?: string | null;
  eyebrow?: string | null;
  lat?: number | null;
  lng?: number | null;
  thumbnailUrl?: string | null;
  onClose?: (() => void) | null;
  className?: string;
  placement?: "float" | "inline";
  userAdjustable?: boolean;
};

export function GlobeBrainSurfaceVideoChip({
  embedSrc,
  embedKey,
  title,
  caption,
  eyebrow,
  lat,
  lng,
  thumbnailUrl,
  onClose = null,
  className,
  placement = "float",
}: GlobeBrainSurfaceVideoChipProps) {
  const shell = (
    <GlobeMapFocusMediaShell
      title={title}
      caption={caption}
      eyebrow={eyebrow}
      lat={lat}
      lng={lng}
      thumbnailUrl={thumbnailUrl}
      youtubeEmbedUrl={embedSrc}
      youtubeVideoKey={embedKey}
      autoPlay
      onClose={onClose ?? undefined}
      className={cn(
        placement === "float" ? GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS : "w-full",
        className,
      )}
    />
  );

  if (placement === "inline") {
    return (
      <div data-globe-brain-surface-video-chip className={className}>
        {shell}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-0 z-[32] flex justify-center px-3",
        className,
      )}
      style={{ top: "min(18vh, 7.5rem)" }}
      data-globe-brain-surface-video-chip
    >
      {shell}
    </div>
  );
}
