"use client";

import { useRef } from "react";
import type { RefObject } from "react";
import { GlobeMapFocusMediaShell } from "@/components/globe/globe-map-focus-media-shell";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { useGlobePinScreenAnchor } from "@/hooks/use-globe-pin-screen-anchor";
import {
  GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS,
  GLOBE_MAP_FOCUS_PIN_ANCHOR_OFFSET_PX,
} from "@/lib/globe/globe-map-focus-hero-layout";
import { cn } from "@/lib/utils";

export function buildBrainSurfaceEmbedSrc(
  embedUrl: string | null | undefined,
  startSeconds?: number | null,
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
    if (typeof startSeconds === "number" && startSeconds > 0) {
      url.searchParams.set("start", String(Math.floor(startSeconds)));
    }
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
  placement?: "float" | "inline" | "pin";
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
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
  globeRef,
}: GlobeBrainSurfaceVideoChipProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinLayout = useGlobePinScreenAnchor({
    globeRef: globeRef ?? { current: null },
    lat,
    lng,
    enabled: placement === "pin",
    containerRef,
  });
  const pinAnchored = placement === "pin" && pinLayout?.onScreen === true;

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
      variant="frameless"
      showMetadataOverlay={false}
      autoPlay
      onClose={onClose ?? undefined}
      className={cn(
        placement === "inline" ? "w-full" : GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS,
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

  if (placement === "pin") {
    return (
      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-0 z-[32] overflow-hidden"
        data-globe-brain-surface-video-chip
      >
        {pinAnchored && pinLayout ? (
          <div
            className="pointer-events-auto absolute z-[1]"
            style={{
              left: pinLayout.x,
              top: pinLayout.y,
              transform: `translate(-50%, calc(-100% - ${GLOBE_MAP_FOCUS_PIN_ANCHOR_OFFSET_PX}px))`,
            }}
            data-globe-brain-surface-video-pin-anchor
          >
            {shell}
          </div>
        ) : (
          <div
            className="pointer-events-auto absolute inset-x-0 flex justify-center px-3"
            style={{ top: "min(18vh, 7.5rem)" }}
          >
            {shell}
          </div>
        )}
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
