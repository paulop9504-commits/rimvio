"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import { cn } from "@/lib/utils";
import { Shimmer } from "@/components/ui/shimmer";

function ContextMediaShortsSlide({
  item,
  eyebrow,
  index,
  total,
  fillViewport,
}: {
  item: ContextMediaReelItem;
  eyebrow: string;
  index: number;
  total: number;
  fillViewport?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(true);
  const { url: blobUrl, loading } = useMediaBlobUrl(
    item.allowLocalBlob === true ? item.mediaContextId : null,
  );
  const src = item.imageUrl ?? blobUrl;
  const isVideo = item.kind === "video";

  useEffect(() => {
    const node = rootRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.6));
      },
      { threshold: [0, 0.6, 0.9] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !src || !isVideo) {
      return;
    }
    if (visible && playing) {
      void node.play().catch(() => setPlaying(false));
    } else {
      node.pause();
    }
  }, [visible, isVideo, playing, src]);

  return (
    <section
      ref={rootRef}
      className={cn(
        "relative flex snap-start snap-always flex-col justify-center px-1 py-2",
        fillViewport ? "min-h-full h-full" : "min-h-[min(78vh,680px)]",
      )}
      data-globe-context-shorts-slide
      data-media-kind={item.kind}
    >
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[min(100%,340px)] overflow-hidden rounded-[1.25rem] bg-black shadow-[0_16px_48px_rgba(0,0,0,0.22)] ring-1 ring-black/10">
        <button
          type="button"
          className="absolute inset-0 z-[1]"
          aria-label={isVideo ? (playing ? "일시정지" : "재생") : item.label}
          onClick={() => {
            if (isVideo && src) {
              setPlaying((value) => !value);
            }
          }}
        />
        {src && isVideo ? (
          <video
            ref={videoRef}
            src={src}
            className="relative z-0 size-full object-cover"
            playsInline
            muted
            loop
            preload="metadata"
          />
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-full object-cover" loading="lazy" />
        ) : item.pendingRemote ? (
          <div className="flex size-full flex-col items-center justify-center gap-3 px-4">
            <Shimmer className="size-14 rounded-full" />
            <p className="text-center text-[13px] font-medium text-white/70">
              공유 {isVideo ? "동영상" : "사진"} 불러오는 중…
            </p>
          </div>
        ) : (
          <div className="flex size-full items-center justify-center px-4 text-center text-[13px] font-medium text-white/70">
            {loading ? "불러오는 중…" : item.label}
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-4 pt-20">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
            {eyebrow}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-white">
            {item.label}
          </p>
        </div>

        <span className="pointer-events-none absolute right-3 top-3 z-[2] rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white/90">
          {index + 1}/{total}
        </span>

        {isVideo && src ? (
          <span className="pointer-events-none absolute left-3 top-3 z-[2] rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white/90">
            {visible && playing ? "일시정지" : "재생"}
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
  /** Each slide fills the scroll viewport — Instagram / Shorts snap. */
  fillViewport?: boolean;
  className?: string;
};

/** Vertical Shorts reel — all photos & videos in one context. */
export function GlobeContextMediaShortsReel({
  items,
  title,
  place,
  fillViewport = false,
  className,
}: GlobeContextMediaShortsReelProps) {
  if (items.length === 0) {
    return null;
  }

  const eyebrow = [title, place].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(fillViewport ? "h-full" : "space-y-1", className)}
      data-globe-context-shorts-reel
      data-globe-context-shorts-count={items.length}
    >
      {items.map((item, index) => (
        <ContextMediaShortsSlide
          key={item.id}
          item={item}
          eyebrow={eyebrow}
          index={index}
          total={items.length}
          fillViewport={fillViewport}
        />
      ))}
      {!fillViewport ? (
        <p className="px-3 pb-1 text-center text-[11px] text-muted-foreground">
          {items.length}개 · 아래로 스와이프
        </p>
      ) : null}
    </div>
  );
}
