"use client";

/**
 * Context capture embed on Workspace MapLibre — autoplays at map focus.
 */

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import type { WorkspaceMapContextMedia } from "@/lib/context-workspace/map/workspace-map-provider";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspaceMapMediaEmbedProps = {
  readonly title: string;
  readonly media: WorkspaceMapContextMedia;
  readonly onClose: () => void;
  readonly className?: string;
};

export function WorkspaceMapMediaEmbed({
  title,
  media,
  onClose,
  className,
}: WorkspaceMapMediaEmbedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const { url: blobUrl, loading } = useMediaBlobUrl(
    media.allowLocalBlob === true ? media.mediaContextId : null,
  );
  const src = media.imageUrl?.trim() || blobUrl;
  const isVideo = media.kind === "video";
  const caption = media.recallCaption?.trim() || null;

  useEffect(() => {
    setPlaying(true);
    const el = videoRef.current;
    if (el) {
      el.currentTime = 0;
    }
  }, [src, media.mediaContextId]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideo || !src) return;
    el.muted = true;
    el.defaultMuted = true;
    if (playing) {
      void el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [playing, isVideo, src]);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-0 bottom-[7.5rem] z-[6] flex justify-center px-3",
        className,
      )}
      data-workspace-map-media-embed
    >
      <div className="relative w-full max-w-[min(92vw,320px)] overflow-hidden rounded-[22px] bg-[#191f28] shadow-[0_16px_40px_rgba(25,31,40,0.35)] ring-1 ring-white/10">
        <button
          type="button"
          className="absolute right-2 top-2 z-[2] flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white"
          aria-label={copy.globe.workspaceMapMediaClose}
          onClick={onClose}
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>

        <div className="relative aspect-[4/5] w-full bg-black">
          {!src && loading ? (
            <div className="absolute inset-0 animate-pulse bg-white/10" />
          ) : null}
          {src && isVideo ? (
            <button
              type="button"
              className="absolute inset-0"
              aria-label={
                playing
                  ? copy.globe.workspaceMapMediaPause
                  : copy.globe.workspaceMapMediaPlay
              }
              onClick={() => setPlaying((v) => !v)}
            >
              <video
                ref={videoRef}
                src={src}
                className="h-full w-full object-cover"
                playsInline
                muted
                autoPlay
                loop
                preload="auto"
              />
              {!playing ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-[18px] font-black text-[#191f28] shadow-sm">
                    ▶
                  </span>
                </span>
              ) : null}
            </button>
          ) : null}
          {src && !isVideo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={title}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : null}
          {!src && !loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold text-white/70">
              {copy.globe.workspaceMapMediaUnavailable}
            </div>
          ) : null}
        </div>

        <div className="space-y-0.5 px-3.5 py-2.5">
          <p className="truncate text-[13px] font-extrabold tracking-tight text-white">
            {title}
          </p>
          {caption ? (
            <p className="truncate text-[11px] font-medium text-white/70">
              {caption}
            </p>
          ) : (
            <p className="text-[11px] font-medium text-white/55">
              {isVideo
                ? copy.globe.workspaceMapMediaVideoHint
                : copy.globe.workspaceMapMediaPhotoHint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
