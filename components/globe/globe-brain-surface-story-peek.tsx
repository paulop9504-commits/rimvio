"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { GlobeBrainSurfaceYoutubeEmbed } from "@/components/globe/globe-brain-surface-youtube-embed";
import { buildBrainSurfaceEmbedSrc } from "@/components/globe/globe-brain-surface-video-chip";
import { extractYouTubeVideoId } from "@/lib/enrichers/youtube-url";
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
  const [playing, setPlaying] = useState(false);
  const embedSrc = buildBrainSurfaceEmbedSrc(candidate.embedUrl);
  const embedKey =
    (candidate.embedUrl ? extractYouTubeVideoId(candidate.embedUrl) : null) ??
    candidate.id;
  const thumb = candidate.markerThumbnailUrl?.trim();
  const hasVideo = Boolean(embedSrc);

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
      <div className="w-full max-w-[22rem] overflow-hidden rounded-[1.2rem] border border-white/85 bg-white/97 shadow-[0_14px_36px_rgba(15,23,42,0.14)] backdrop-blur-2xl ring-1 ring-black/[0.04]">
        <div className="relative bg-slate-950">
          {playing && embedSrc ? (
            <GlobeBrainSurfaceYoutubeEmbed
              videoKey={embedKey}
              embedSrc={embedSrc}
              title={candidate.previewTitle}
              className="aspect-video max-h-[10.5rem] w-full border-0"
            />
          ) : thumb ? (
            <button
              type="button"
              onClick={() => hasVideo && setPlaying(true)}
              className={cn(
                "relative block aspect-video max-h-[10.5rem] w-full overflow-hidden",
                hasVideo && "cursor-pointer active:opacity-95",
              )}
              aria-label={hasVideo ? candidate.previewTitle : candidate.label}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt="" className="h-full w-full object-cover" />
              {hasVideo ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/22">
                  <span className="flex size-10 items-center justify-center rounded-full bg-black/50 text-base text-white">
                    ▶
                  </span>
                </span>
              ) : null}
            </button>
          ) : (
            <div className="flex aspect-video max-h-[10.5rem] w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 px-4 text-center text-[13px] font-semibold text-white/85">
              {candidate.label}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md active:scale-95"
            aria-label={copy.globe.brainSurfaceStoryCloseAria}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>

        <div className="px-3.5 pb-3 pt-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {candidate.placeLabel}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[14px] font-semibold leading-snug text-slate-900">
            {candidate.label}
          </p>
          <button
            type="button"
            onClick={onConnect}
            className="mt-2.5 flex w-full items-center justify-center rounded-full bg-[#0071e3] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(0,113,227,0.28)] active:scale-[0.98]"
            data-globe-brain-surface-connect-cta
          >
            {copy.globe.brainSurfaceConnectCta}
          </button>
        </div>
      </div>
    </div>
  );
}
