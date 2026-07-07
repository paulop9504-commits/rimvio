"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy/human-ko";

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
  const slides =
    videoUrl != null && videoUrl.trim()
      ? [videoUrl.trim(), ...images]
      : images.length > 0
        ? images
        : [];
  const [mediaIndex, setMediaIndex] = useState(0);
  const current = slides[mediaIndex] ?? null;
  const isVideo =
    current != null &&
    (current === videoUrl || /\.(mp4|webm|mov)(\?|$)/i.test(current));

  return (
    <article
      className={cn(
        "w-[min(100vw-1.5rem,17.5rem)] overflow-hidden rounded-[1.1rem] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06]",
        className,
      )}
      data-globe-resource-reel-airbnb-card
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative aspect-[4/3] bg-[#f4f4f5]">
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

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="absolute right-1.5 top-1.5 z-[4] flex size-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md active:scale-95"
          aria-label={closeAriaLabel}
        >
          <X className="size-3.5" aria-hidden />
        </button>

        {topAction ? (
          <div className="pointer-events-none absolute inset-x-1.5 top-1.5 z-[3] pr-8">
            <div className="pointer-events-auto inline-flex max-w-[calc(100%-2rem)]">
              {topAction}
            </div>
          </div>
        ) : null}

        {slides.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1">
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
                  "pointer-events-auto size-1.5 rounded-full",
                  index === mediaIndex ? "bg-white" : "bg-white/55",
                )}
              />
            ))}
          </div>
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
