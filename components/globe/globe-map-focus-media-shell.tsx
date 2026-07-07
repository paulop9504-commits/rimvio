"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Play, X } from "lucide-react";
import { ContextMediaVideoSoundButton } from "@/components/globe/context-media-video-sound-button";
import { GlobeBrainSurfaceYoutubeEmbed } from "@/components/globe/globe-brain-surface-youtube-embed";
import { buildBrainSurfaceEmbedSrc } from "@/components/globe/globe-brain-surface-video-chip";
import { useGlobeContextVideoSound } from "@/hooks/use-globe-context-video-sound";
import { useMediaIntrinsicSize } from "@/hooks/use-media-intrinsic-size";
import { formatMapFocusCoords } from "@/lib/globe/format-map-focus-coords";
import {
  GLOBE_MAP_FOCUS_HERO_MEDIA_CLASS,
  GLOBE_MAP_FOCUS_HERO_MEDIA_INTERACTIVE_CLASS,
  GLOBE_MAP_FOCUS_HERO_SHELL_CLASS,
  GLOBE_MAP_FOCUS_HERO_SHELL_FALLBACK_ASPECT,
  resolveGlobeMapFocusHeroShellStyle,
} from "@/lib/globe/globe-map-focus-hero-layout";
import { cn } from "@/lib/utils";

export type GlobeMapFocusMediaShellProps = {
  title: string;
  caption?: string | null;
  eyebrow?: string | null;
  lat?: number | null;
  lng?: number | null;
  thumbnailUrl?: string | null;
  youtubeEmbedUrl?: string | null;
  youtubeVideoKey?: string | null;
  youtubeStartSeconds?: number | null;
  nativeVideoSrc?: string | null;
  imageSrc?: string | null;
  /** Pre-built media slot (map replay reel). Skips built-in media rendering. */
  mediaSlot?: ReactNode;
  /** Tap-to-play for YouTube / native when false. */
  autoPlay?: boolean;
  soundByDefault?: boolean;
  showMetadataOverlay?: boolean;
  /** card = legacy chrome · frameless = video-only on map */
  variant?: "card" | "frameless";
  onClose?: () => void;
  closeAriaLabel?: string;
  onHeroPress?: () => void;
  footerAction?: ReactNode;
  className?: string;
  onTouchStart?: (event: React.TouchEvent) => void;
  onTouchMove?: (event: React.TouchEvent) => void;
  onTouchEnd?: (event: React.TouchEvent) => void;
};

function resolveMediaAspectStyle(input: {
  intrinsic: { width: number; height: number } | null;
  hasYoutube: boolean;
}): { aspectRatio: string } {
  if (input.intrinsic) {
    return resolveGlobeMapFocusHeroShellStyle(input.intrinsic);
  }
  if (input.hasYoutube) {
    return { aspectRatio: "16 / 9" };
  }
  return { aspectRatio: GLOBE_MAP_FOCUS_HERO_SHELL_FALLBACK_ASPECT };
}

function NativeVideoLayer({
  src,
  autoPlay,
  soundByDefault,
}: {
  src: string;
  autoPlay: boolean;
  soundByDefault: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(autoPlay);
  const { size, onVideoMetadata } = useMediaIntrinsicSize();
  const shellStyle = resolveGlobeMapFocusHeroShellStyle(
    size ? { width: size.width, height: size.height } : null,
  );

  const { toggleSound, soundOn } = useGlobeContextVideoSound({
    videoRef,
    src,
    isVideo: true,
    playing,
    soundByDefault,
    onPlayFailed: () => setPlaying(false),
  });

  useEffect(() => {
    const el = videoRef.current;
    if (!el) {
      return;
    }
    if (playing) {
      void el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [playing]);

  return (
    <div className={GLOBE_MAP_FOCUS_HERO_SHELL_CLASS} style={shellStyle}>
      <video
        ref={videoRef}
        src={src}
        className={GLOBE_MAP_FOCUS_HERO_MEDIA_INTERACTIVE_CLASS}
        playsInline
        loop
        muted={!soundOn}
        preload="metadata"
        onLoadedMetadata={onVideoMetadata}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[4] flex justify-end px-3">
        <ContextMediaVideoSoundButton
          soundOn={soundOn}
          variant="pill"
          className="pointer-events-auto"
          onToggleSound={() => {
            toggleSound();
            if (!playing) {
              setPlaying(true);
            }
          }}
        />
      </div>
    </div>
  );
}

function YoutubeThumbLayer({
  thumbnailUrl,
  title,
  onPlay,
  frameless = false,
}: {
  thumbnailUrl: string | null;
  title: string;
  onPlay: () => void;
  frameless?: boolean;
}) {
  const shellStyle = resolveMediaAspectStyle({ intrinsic: null, hasYoutube: true });

  return (
    <button
      type="button"
      onClick={onPlay}
      className={cn(GLOBE_MAP_FOCUS_HERO_SHELL_CLASS, "block w-full cursor-pointer active:opacity-95")}
      style={shellStyle}
      aria-label={title}
    >
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnailUrl} alt="" className={GLOBE_MAP_FOCUS_HERO_MEDIA_CLASS} />
      ) : (
        <div className="flex h-full min-h-[9rem] w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
          {!frameless ? (
            <p className="px-4 text-center text-[13px] font-semibold text-white/88">{title}</p>
          ) : null}
        </div>
      )}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/18">
        <span className="flex size-10 items-center justify-center rounded-full bg-black/48 text-white backdrop-blur-sm">
          <Play className="size-4 fill-white/90" aria-hidden />
        </span>
      </span>
    </button>
  );
}

/** Frameless map media bubble — personal replay SSOT (native video · photo · YouTube thumb). */
export function GlobeMapFocusMediaShell({
  title,
  caption,
  eyebrow,
  lat,
  lng,
  thumbnailUrl,
  youtubeEmbedUrl,
  youtubeVideoKey,
  youtubeStartSeconds = null,
  nativeVideoSrc,
  imageSrc,
  mediaSlot,
  autoPlay = false,
  soundByDefault = false,
  showMetadataOverlay = true,
  variant = "card",
  onClose,
  closeAriaLabel = "닫기",
  onHeroPress,
  footerAction,
  className,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: GlobeMapFocusMediaShellProps) {
  const frameless = variant === "frameless";
  const metadataOnVideo = showMetadataOverlay && !frameless;
  const [youtubePlaying, setYoutubePlaying] = useState(
    autoPlay && Boolean(youtubeEmbedUrl?.trim()),
  );
  const { size, reset, onImageLoad } = useMediaIntrinsicSize();
  const embedSrc = youtubePlaying
    ? buildBrainSurfaceEmbedSrc(youtubeEmbedUrl, youtubeStartSeconds)
    : null;
  const embedKey = youtubeVideoKey?.trim() || "youtube";
  const thumb = thumbnailUrl?.trim() || null;
  const image = imageSrc?.trim() || null;
  const native = nativeVideoSrc?.trim() || null;
  const hasYoutube = Boolean(youtubeEmbedUrl?.trim());
  const coords =
    typeof lat === "number" && typeof lng === "number"
      ? formatMapFocusCoords(lat, lng)
      : null;
  const captionLine = caption?.trim() || null;
  const eyebrowLine = eyebrow?.trim() || null;

  useEffect(() => {
    reset();
    setYoutubePlaying(autoPlay && Boolean(youtubeEmbedUrl?.trim()));
  }, [autoPlay, reset, youtubeEmbedUrl, youtubeVideoKey, youtubeStartSeconds, native, image, thumb]);

  const shellStyle = resolveMediaAspectStyle({
    intrinsic: size,
    hasYoutube: hasYoutube && youtubePlaying,
  });

  let mediaBody: ReactNode = null;

  if (mediaSlot) {
    mediaBody = mediaSlot;
  } else if (native) {
    mediaBody = (
      <NativeVideoLayer src={native} autoPlay={autoPlay} soundByDefault={soundByDefault} />
    );
  } else if (youtubePlaying && embedSrc) {
    mediaBody = (
      <div className={GLOBE_MAP_FOCUS_HERO_SHELL_CLASS} style={shellStyle}>
        <GlobeBrainSurfaceYoutubeEmbed
          videoKey={embedKey}
          embedSrc={embedSrc}
          title={title}
          className="h-full w-full border-0 object-cover"
        />
      </div>
    );
  } else if (hasYoutube) {
    mediaBody = (
      <YoutubeThumbLayer
        thumbnailUrl={thumb}
        title={title}
        onPlay={() => setYoutubePlaying(true)}
        frameless={frameless}
      />
    );
  } else if (image) {
    mediaBody = (
      <div className={GLOBE_MAP_FOCUS_HERO_SHELL_CLASS} style={shellStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt=""
          className={GLOBE_MAP_FOCUS_HERO_MEDIA_INTERACTIVE_CLASS}
          loading="lazy"
          onLoad={onImageLoad}
        />
      </div>
    );
  } else if (thumb) {
    mediaBody = (
      <div className={GLOBE_MAP_FOCUS_HERO_SHELL_CLASS} style={shellStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt=""
          className={GLOBE_MAP_FOCUS_HERO_MEDIA_INTERACTIVE_CLASS}
          loading="lazy"
          onLoad={onImageLoad}
        />
      </div>
    );
  } else {
    mediaBody = (
      <div
        className={cn(GLOBE_MAP_FOCUS_HERO_SHELL_CLASS, "flex min-h-[9rem] items-center justify-center")}
        style={shellStyle}
      >
        {!frameless ? (
          <p className="px-4 text-center text-[13px] font-semibold text-white/88">{title}</p>
        ) : null}
      </div>
    );
  }

  return (
    <article
      className={cn(
        frameless
          ? "overflow-visible"
          : "overflow-hidden rounded-xl bg-[#1d1d1f] shadow-[0_16px_40px_rgba(0,0,0,0.28)] ring-1 ring-white/10",
        className,
      )}
      data-globe-map-focus-media-shell
      data-globe-map-focus-media-variant={variant}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative">
        <div
          className={cn(
            "relative overflow-hidden",
            frameless
              ? "rounded-[0.85rem] bg-black/20 shadow-[0_14px_36px_rgba(0,0,0,0.32)] ring-1 ring-white/16"
              : "bg-[#141416]",
            onHeroPress && "cursor-pointer",
          )}
          role={onHeroPress ? "button" : undefined}
          tabIndex={onHeroPress ? 0 : undefined}
          aria-label={onHeroPress ? title : undefined}
          onClick={
            onHeroPress
              ? (event) => {
                  event.stopPropagation();
                  onHeroPress();
                }
              : undefined
          }
          onKeyDown={
            onHeroPress
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onHeroPress();
                  }
                }
              : undefined
          }
        >
          {mediaBody}
        </div>

        {onClose ? (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onTouchEnd={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="absolute right-1.5 top-1.5 z-[4] flex size-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md active:scale-95"
            aria-label={closeAriaLabel}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}

        {metadataOnVideo ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] bg-gradient-to-t from-black/78 via-black/34 to-transparent px-2.5 pb-2 pt-12">
            {eyebrowLine ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/62">
                {eyebrowLine}
              </p>
            ) : null}
            <h2 className="line-clamp-2 text-[16px] font-bold leading-tight tracking-tight text-white">
              {title}
            </h2>
            {captionLine ? (
              <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug text-white/85">
                {captionLine}
              </p>
            ) : null}
            {coords ? (
              <p className="mt-1 text-[10px] font-medium tabular-nums text-white/55">{coords}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {!frameless && footerAction ? (
        <div className="border-t border-white/10 bg-[#141416] px-2.5 py-2">{footerAction}</div>
      ) : null}
    </article>
  );
}
