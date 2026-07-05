"use client";

import { X } from "lucide-react";
import { GlobeBrainSurfaceFloatingFrame } from "@/components/globe/globe-brain-surface-floating-frame";
import { GlobeBrainSurfaceYoutubeEmbed } from "@/components/globe/globe-brain-surface-youtube-embed";
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
  onClose?: (() => void) | null;
  className?: string;
  placement?: "float" | "inline";
  userAdjustable?: boolean;
};

const VIDEO_CHIP_BODY = "relative flex h-full min-h-0 flex-col bg-slate-950";

export function GlobeBrainSurfaceVideoChip({
  embedSrc,
  embedKey,
  title,
  onClose = null,
  className,
  placement = "float",
  userAdjustable = true,
}: GlobeBrainSurfaceVideoChipProps) {
  const body = (
    <div className={VIDEO_CHIP_BODY}>
      <GlobeBrainSurfaceYoutubeEmbed
        videoKey={embedKey}
        embedSrc={embedSrc}
        title={title}
        className="h-full min-h-0 w-full flex-1 border-0 object-cover"
      />
      {onClose ? (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="absolute right-1 top-1 z-[2] flex size-6 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md active:scale-[0.97]"
          aria-label="닫기"
        >
          <X className="size-3" aria-hidden />
        </button>
      ) : null}
    </div>
  );

  if (placement === "inline" || !userAdjustable) {
    return (
      <div
        className={cn("relative overflow-hidden rounded-[1rem]", className)}
        data-globe-brain-surface-video-chip
      >
        <div className="aspect-video max-h-[7.25rem] w-[min(13.5rem,calc(100vw-2rem))]">
          {body}
        </div>
      </div>
    );
  }

  return (
    <GlobeBrainSurfaceFloatingFrame
      frameId="brain-surface-video"
      dragLabel="영상 프레임 이동"
      className={className}
      bodyClassName="overflow-hidden p-0"
      shellClassName="overflow-hidden rounded-[1rem] shadow-[0_12px_32px_rgba(15,23,42,0.24)] ring-1 ring-white/18"
    >
      {body}
    </GlobeBrainSurfaceFloatingFrame>
  );
}
