"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import { cn } from "@/lib/utils";

function ContextMediaShortsSlide({
  item,
  eyebrow,
  active,
}: {
  item: ContextMediaReelItem;
  eyebrow: string;
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const [playing, setPlaying] = useState(false);
  const { url: blobUrl, loading } = useMediaBlobUrl(item.mediaContextId);
  const src = item.imageUrl ?? blobUrl;
  const isVideo = item.kind === "video";

  useEffect(() => {
    const node = rootRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.55,
        );
        setPlaying(visible);
      },
      { threshold: [0, 0.55, 0.85] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !src || !isVideo) {
      return;
    }
    if (active && playing) {
      void node.play().catch(() => {
        /* autoplay blocked */
      });
    } else {
      node.pause();
    }
  }, [active, isVideo, playing, src]);

  return (
    <section
      ref={rootRef}
      className="relative flex min-h-[min(78vh,680px)] snap-start snap-always flex-col justify-center px-1 py-2"
      data-globe-context-shorts-slide
      data-media-kind={item.kind}
    >
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[min(100%,320px)] overflow-hidden rounded-[1.25rem] bg-black shadow-[0_16px_48px_rgba(0,0,0,0.22)] ring-1 ring-black/10">
        {src && isVideo ? (
          <video
            ref={videoRef}
            src={src}
            className="size-full object-cover"
            playsInline
            muted
            loop
            preload="metadata"
          />
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center px-4 text-center text-[13px] font-medium text-white/70">
            {loading ? "불러오는 중…" : item.label}
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-4 pb-4 pt-16">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
            {eyebrow}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-white">
            {item.label}
          </p>
        </div>

        {isVideo && src ? (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white/85">
            {playing ? "▶" : "❚❚"}
          </span>
        ) : null}
      </div>
    </section>
  );
}

export type GlobeContextMediaShortsReelProps = {
  items: readonly ContextMediaReelItem[];
  title: string;
  place: string;
  className?: string;
};

/** Vertical Shorts reel — all photos & videos in one context. */
export function GlobeContextMediaShortsReel({
  items,
  title,
  place,
  className,
}: GlobeContextMediaShortsReelProps) {
  if (items.length === 0) {
    return null;
  }

  const eyebrow = [title, place].filter(Boolean).join(" · ");

  return (
    <div
      className={cn("space-y-1", className)}
      data-globe-context-shorts-reel
      data-globe-context-shorts-count={items.length}
    >
      {items.map((item) => (
        <ContextMediaShortsSlide
          key={item.id}
          item={item}
          eyebrow={eyebrow}
          active
        />
      ))}
      <p className="px-3 pb-1 text-center text-[11px] text-muted-foreground">
        {items.length}개 · 아래로 스와이프
      </p>
    </div>
  );
}
