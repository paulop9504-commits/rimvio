"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy/human-ko";

const MEDIA_SWIPE_MIN_PX = 32;

export type GlobeResourceReelAirbnbCardProps = {
  title: string;
  images: readonly string[];
  videoUrl?: string | null;
  ratingLabel?: string | null;
  subtitle?: string | null;
  specsLine?: string | null;
  priceLabel?: string | null;
  topAction?: ReactNode;
  onClose: () => void;
  closeAriaLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string | null;
  swipeHint?: string | null;
  className?: string;
  onTouchStart?: (event: React.TouchEvent) => void;
  onTouchEnd?: (event: React.TouchEvent) => void;
};

export function GlobeResourceReelAirbnbCard({
  title,
  images,
  videoUrl = null,
  ratingLabel = null,
  subtitle = null,
  specsLine = null,
  priceLabel = null,
  topAction = null,
  onClose,
  closeAriaLabel = copy.globe.resourceReelCloseAria,
  onPrimaryAction,
  primaryActionLabel = null,
  swipeHint = null,
  className,
  onTouchStart,
  onTouchEnd,
}: GlobeResourceReelAirbnbCardProps) {
  const trimmedVideo = videoUrl?.trim() ?? "";
  const slides =
    trimmedVideo.length > 0
      ? [trimmedVideo, ...images]
      : images.length > 0
        ? [...images]
        : [];
  const [mediaIndex, setMediaIndex] = useState(0);
  const mediaTouchRef = useRef<{ x: number; y: number } | null>(null);
  const safeIndex = Math.min(mediaIndex, Math.max(0, slides.length - 1));
  const current = slides[safeIndex] ?? null;
  const isVideo =
    current != null &&
    (current === trimmedVideo || /\.(mp4|webm|mov)(\?|$)/i.test(current));

  const goToSlide = (next: number) => {
    if (slides.length === 0) {
      return;
    }
    const clamped = ((next % slides.length) + slides.length) % slides.length;
    setMediaIndex(clamped);
  };

  const handleMediaTouchStart = (event: React.TouchEvent) => {
    event.stopPropagation();
    const touch = event.changedTouches[0] ?? event.touches[0];
    if (!touch) {
      return;
    }
    mediaTouchRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleMediaTouchEnd = (event: React.TouchEvent) => {
    event.stopPropagation();
    const start = mediaTouchRef.current;
    const touch = event.changedTouches[0];
    mediaTouchRef.current = null;
    if (!start || !touch || slides.length <= 1) {
      return;
    }
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < MEDIA_SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) {
      return;
    }
    goToSlide(dx > 0 ? safeIndex - 1 : safeIndex + 1);
  };

  return (
    <article
      className={cn(
        "w-[min(100vw-1.5rem,19rem)] overflow-hidden rounded-[1.25rem] bg-white shadow-[0_12px_36px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.06]",
        className,
      )}
      data-globe-resource-reel-airbnb-card
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="relative aspect-[4/5] bg-[#f4f4f5]"
        onTouchStart={handleMediaTouchStart}
        onTouchEnd={handleMediaTouchEnd}
        data-globe-resource-reel-gallery
      >
        {isVideo && current ? (
          <video
            key={current}
            src={current}
            className="size-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="" className="size-full object-cover" draggable={false} />
        ) : (
          <div className="flex size-full items-center justify-center px-4 text-center text-[13px] font-medium text-[#86868b]">
            {title}
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="absolute right-2 top-2 z-[4] flex size-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md active:scale-95"
          aria-label={closeAriaLabel}
        >
          <X className="size-4" aria-hidden />
        </button>

        {isVideo ? (
          <span className="absolute left-2 top-2 z-[3] inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
            <Play className="size-3 fill-white" aria-hidden />
            {copy.globe.resourceReelVideoChip}
          </span>
        ) : slides.length > 1 ? (
          <span className="absolute left-2 top-2 z-[3] rounded-full bg-black/50 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
            {copy.globe.resourceReelPhotoCount(safeIndex + 1, slides.length)}
          </span>
        ) : null}

        {topAction ? (
          <div className="pointer-events-none absolute inset-x-2 top-11 z-[3] pr-9">
            <div className="pointer-events-auto inline-flex max-w-[calc(100%-2rem)]">
              {topAction}
            </div>
          </div>
        ) : null}

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label={copy.globe.resourceReelPrevPhoto}
              onClick={(event) => {
                event.stopPropagation();
                goToSlide(safeIndex - 1);
              }}
              className="absolute left-1.5 top-1/2 z-[4] flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#222] shadow-md backdrop-blur-md active:scale-95"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={copy.globe.resourceReelNextPhoto}
              onClick={(event) => {
                event.stopPropagation();
                goToSlide(safeIndex + 1);
              }}
              className="absolute right-1.5 top-1/2 z-[4] flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#222] shadow-md backdrop-blur-md active:scale-95"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>

            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {slides.map((slide, index) => (
                <button
                  key={`${slide}:${index}`}
                  type="button"
                  aria-label={`${index + 1}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setMediaIndex(index);
                  }}
                  className={cn(
                    "pointer-events-auto h-1.5 rounded-full transition-all",
                    index === safeIndex ? "w-4 bg-white" : "w-1.5 bg-white/55",
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onPrimaryAction}
        disabled={!onPrimaryAction}
        className={cn(
          "w-full px-3.5 py-3 text-left",
          onPrimaryAction && "active:bg-[#fafafa]",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#222]">
            {title}
          </h2>
          {ratingLabel ? (
            <span className="shrink-0 pt-0.5 text-[13px] font-medium text-[#222]">
              {ratingLabel}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className="mt-1 line-clamp-1 text-[13px] text-[#717171]">{subtitle}</p>
        ) : null}
        {specsLine ? (
          <p className="mt-0.5 line-clamp-1 text-[13px] text-[#717171]">{specsLine}</p>
        ) : null}
        {priceLabel ? (
          <p className="mt-2 text-[14px] text-[#222]">
            <span className="text-[13px] font-normal text-[#222]">
              {copy.globe.resourceReelTotalLabel}{" "}
            </span>
            <strong className="font-semibold">{priceLabel}</strong>
          </p>
        ) : null}
        {primaryActionLabel && onPrimaryAction ? (
          <span className="mt-2 inline-flex rounded-full bg-[#0071e3] px-4 py-2 text-[12px] font-semibold text-white">
            {primaryActionLabel}
          </span>
        ) : null}
      </button>

      {swipeHint ? (
        <p className="border-t border-black/[0.05] px-3.5 py-2 text-center text-[11px] text-[#86868b]">
          {swipeHint}
        </p>
      ) : null}
    </article>
  );
}
