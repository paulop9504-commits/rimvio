"use client";

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
  const embedSrc = buildBrainSurfaceEmbedSrc(candidate.embedUrl);
  const embedKey =
    (candidate.embedUrl ? extractYouTubeVideoId(candidate.embedUrl) : null) ??
    candidate.id;
  const thumb = candidate.markerThumbnailUrl?.trim();

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-0 z-[31] flex justify-center px-4",
        className,
      )}
      style={{
        bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.65rem)",
      }}
      data-globe-brain-surface-story-peek
    >
      <div className="w-full max-w-[20rem] overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/96 shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur-2xl ring-1 ring-black/[0.04]">
        <div className="relative bg-slate-950">
          {embedSrc ? (
            <GlobeBrainSurfaceYoutubeEmbed
              videoKey={embedKey}
              embedSrc={embedSrc}
              title={candidate.previewTitle}
              className="aspect-[4/5] max-h-[14rem] w-full border-0"
            />
          ) : thumb ? (
            <div className="relative aspect-[4/5] max-h-[14rem] w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt="" className="h-full w-full object-cover" />
              {candidate.markerMediaKind === "video" ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/18 text-white">
                  <span className="flex size-11 items-center justify-center rounded-full bg-black/45 text-lg">
                    ▶
                  </span>
                </span>
              ) : null}
            </div>
          ) : (
            <div className="flex aspect-[4/5] max-h-[14rem] w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-[13px] font-semibold text-white/80">
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

        <div className="px-3.5 pb-3.5 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {candidate.placeLabel}
          </p>
          <p className="mt-1 line-clamp-1 text-[14px] font-semibold leading-snug text-slate-900">
            {candidate.label}
          </p>
          <button
            type="button"
            onClick={onConnect}
            className="mt-3 flex w-full items-center justify-center rounded-full bg-[#0071e3] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(0,113,227,0.28)] active:scale-[0.98]"
            data-globe-brain-surface-connect-cta
          >
            {copy.globe.brainSurfaceConnectCta}
          </button>
        </div>
      </div>
    </div>
  );
}
