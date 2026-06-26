"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import {
  buildMarketListingMediaItems,
  type MarketListingMediaItem,
} from "@/lib/globe/market/market-listing-media";
import { cn } from "@/lib/utils";

function resolveMediaItems(input: {
  photoUrl: string | null;
  videoUrl: string | null;
  detail: { photoUrls?: string[]; videoUrls?: string[] };
}): MarketListingMediaItem[] {
  const items = buildMarketListingMediaItems(input.detail);
  if (items.length > 0) {
    return items;
  }
  const merged: MarketListingMediaItem[] = [];
  const video = input.videoUrl?.trim();
  if (video) {
    merged.push({ kind: "video", url: video });
  }
  const photo = input.photoUrl?.trim();
  if (photo) {
    merged.push({ kind: "photo", url: photo });
  }
  return merged;
}

export function OpportunityRowMediaAutoplay({
  photoUrl,
  videoUrl,
  detail,
  className,
}: {
  photoUrl: string | null;
  videoUrl: string | null;
  detail: { photoUrls?: string[]; videoUrls?: string[] };
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  const items = useMemo(
    () => resolveMediaItems({ photoUrl, videoUrl, detail }),
    [detail, photoUrl, videoUrl],
  );

  const current = items[index] ?? null;

  useEffect(() => {
    const node = rootRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [items]);

  useEffect(() => {
    if (!visible || items.length <= 1) {
      return;
    }
    const id = window.setInterval(() => {
      setIndex((value) => (value + 1) % items.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [items.length, visible]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || current?.kind !== "video") {
      return;
    }
    el.muted = true;
    el.loop = true;
    if (visible) {
      void el.play().catch(() => {
        // Autoplay may be blocked — poster frame still shows.
      });
      return;
    }
    el.pause();
  }, [current?.kind, current?.url, visible]);

  if (items.length === 0) {
    return (
      <div
        ref={rootRef}
        className={cn(
          "flex size-full items-center justify-center bg-[#f2f4f6] text-[#b0b8c1]",
          className,
        )}
        aria-hidden
      >
        <ImageIcon className="size-5" />
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative size-full overflow-hidden bg-[#eef1f4]", className)}>
      {current?.kind === "video" ? (
        <video
          key={current.url}
          ref={videoRef}
          src={current.url}
          playsInline
          muted
          loop
          preload="metadata"
          className="size-full object-cover"
        />
      ) : current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={current.url}
          src={current.url}
          alt=""
          className="size-full object-cover transition-opacity duration-500"
          loading="lazy"
          decoding="async"
        />
      ) : null}

      {items.length > 1 ? (
        <span
          className="pointer-events-none absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5"
          aria-hidden
        >
          {items.map((item, dotIndex) => (
            <span
              key={`${item.kind}-${item.url}`}
              className={cn(
                "size-1 rounded-full transition-colors",
                dotIndex === index ? "bg-white" : "bg-white/45",
              )}
            />
          ))}
        </span>
      ) : null}
    </div>
  );
}
