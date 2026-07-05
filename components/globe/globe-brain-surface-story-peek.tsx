"use client";

import { GlobeMapFocusMediaShell } from "@/components/globe/globe-map-focus-media-shell";
import {
  GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS,
} from "@/lib/globe/globe-map-focus-hero-layout";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeBrainSurfaceStoryPeekProps = {
  candidate: BrainSurfaceProjectionCandidate;
  onClose: () => void;
  onConnect: () => void;
  className?: string;
};

export function GlobeBrainSurfaceStoryPeek({
  candidate,
  onClose,
  onConnect,
  className,
}: GlobeBrainSurfaceStoryPeekProps) {
  const thumb = candidate.markerThumbnailUrl?.trim() || null;
  const embedUrl = candidate.embedUrl?.trim() || null;
  const caption =
    candidate.previewBody?.trim() && candidate.previewBody.trim() !== candidate.label.trim()
      ? candidate.previewBody.trim()
      : null;

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-0 z-[31] flex justify-center px-3",
        className,
      )}
      style={{
        bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.5rem)",
      }}
      data-globe-brain-surface-story-peek
    >
      <div className="flex w-full max-w-[19rem] flex-col items-center gap-2">
        <GlobeMapFocusMediaShell
          className={GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS}
          title={candidate.label}
          caption={caption}
          eyebrow={candidate.placeLabel}
          lat={candidate.lat}
          lng={candidate.lng}
          thumbnailUrl={thumb}
          youtubeEmbedUrl={embedUrl}
          youtubeVideoKey={candidate.id}
          onClose={onClose}
          closeAriaLabel={copy.globe.brainSurfaceStoryCloseAria}
        />
        <button
          type="button"
          onClick={onConnect}
          className="flex w-full items-center justify-center rounded-full bg-black/52 px-4 py-2.5 text-[13px] font-semibold text-white ring-1 ring-white/12 backdrop-blur-md active:scale-[0.98]"
          data-globe-brain-surface-connect-cta
        >
          {copy.globe.brainSurfaceConnectCta}
        </button>
      </div>
    </div>
  );
}
