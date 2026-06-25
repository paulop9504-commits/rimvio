"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import type { MarketListingMediaItem } from "@/lib/globe/market/market-listing-media";
import { cn } from "@/lib/utils";

export function MarketListingMediaHero({
  item,
  playbackKey,
  className,
}: {
  item: MarketListingMediaItem | null;
  /** Changes when user picks another thumb — resets video playback. */
  playbackKey?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playingWithSound, setPlayingWithSound] = useState(false);

  useEffect(() => {
    setPlayingWithSound(false);
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
      el.muted = true;
    }
  }, [playbackKey, item?.url]);

  if (!item) {
    return null;
  }

  if (item.kind === "video") {
    return (
      <div className={cn("relative size-full bg-black", className)}>
        <video
          ref={videoRef}
          src={item.url}
          playsInline
          preload="metadata"
          muted={!playingWithSound}
          controls={playingWithSound}
          className="size-full object-contain"
          onEnded={() => setPlayingWithSound(false)}
        />
        {!playingWithSound ? (
          <button
            type="button"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25"
            onClick={() => {
              const el = videoRef.current;
              if (!el) {
                return;
              }
              el.muted = false;
              setPlayingWithSound(true);
              void el.play();
            }}
            aria-label={copy.globe.marketListingMediaPlayAria}
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/40 backdrop-blur-sm">
              <Play className="size-7 fill-white text-white" aria-hidden />
            </span>
            <span className="px-4 text-center text-[13px] font-medium text-white drop-shadow">
              {copy.globe.marketListingMediaPlayHint}
            </span>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.url} alt="" className={cn("size-full object-cover", className)} />
  );
}

export function MarketListingMediaThumb({
  item,
  active,
  onPress,
  className,
}: {
  item: MarketListingMediaItem;
  active?: boolean;
  onPress?: () => void;
  className?: string;
}) {
  const body =
    item.kind === "video" ? (
      <>
        <video
          src={item.url}
          muted
          playsInline
          preload="metadata"
          className="size-full object-cover"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
          <Play className="size-4 text-white drop-shadow" aria-hidden />
        </span>
      </>
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.url} alt="" className="size-full object-cover" />
    );

  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        className={cn(
          "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-2",
          active ? "ring-[#3182f6]" : "ring-transparent",
          className,
        )}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={cn("relative size-full overflow-hidden", className)}>
      {body}
    </div>
  );
}

export function MarketListingMediaRowThumb({
  photoUrl,
  videoUrl,
  className,
}: {
  photoUrl: string | null;
  videoUrl: string | null;
  className?: string;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt="" className={cn("size-full object-cover", className)} loading="lazy" />
    );
  }
  if (videoUrl) {
    return (
      <div className={cn("relative size-full", className)}>
        <video
          src={videoUrl}
          muted
          playsInline
          preload="metadata"
          className="size-full object-cover"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="size-5 text-white drop-shadow" aria-hidden />
        </span>
      </div>
    );
  }
  return null;
}
