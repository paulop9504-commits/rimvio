"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronRight, ImageIcon, MapPin, Play } from "lucide-react";
import { MarketListingMediaRowThumb } from "@/components/market/market-listing-media-thumb";
import { MarketIntentOwnershipChip } from "@/components/market/market-intent-ownership-chip";
import { useCopy } from "@/hooks/use-copy";
import {
  buildOpportunityCardFilm,
  type OpportunityCardFilmSegment,
} from "@/lib/globe/opportunity-field/build-opportunity-card-film";
import type { OpportunityRow } from "@/lib/globe/opportunity-field";
import { cn } from "@/lib/utils";

export type OpportunityCardSlotProps = {
  row: OpportunityRow;
  scoreAria: (pct: number) => string;
  neighborBadge: string;
  storyTitle: string;
  storyEmpty: string;
  swipeHint: string;
  chatCta: string;
  onChat: () => void;
  className?: string;
};

const FILM_H = "h-[132px]";

export function OpportunityCardSlot({
  row,
  scoreAria,
  neighborBadge,
  storyTitle,
  storyEmpty,
  swipeHint,
  chatCta,
  onChat,
  className,
}: OpportunityCardSlotProps) {
  const copy = useCopy();
  const segments = buildOpportunityCardFilm(row);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFilmFade, setShowFilmFade] = useState(false);

  const updateFilmFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setShowFilmFade(max > 8 && el.scrollLeft < max - 8);
  }, []);

  useEffect(() => {
    updateFilmFade();
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(() => updateFilmFade());
    observer.observe(el);
    return () => observer.disconnect();
  }, [segments.length, updateFilmFade]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "border-b border-[#f2f4f6] bg-white px-4 py-3 active:bg-[#f8f9fb]",
        className,
      )}
      data-opportunity-card={row.listingId}
      data-opportunity-ownership="neighbor"
    >
      <button
        type="button"
        onClick={onChat}
        className="flex w-full items-start gap-3 text-left"
        aria-label={`${row.title} · ${chatCta}`}
      >
        <div className="relative size-[52px] shrink-0 overflow-hidden rounded-2xl bg-[#f2f4f6]">
          {row.photoUrl || row.videoUrl ? (
            <MarketListingMediaRowThumb photoUrl={row.photoUrl} videoUrl={row.videoUrl} />
          ) : (
            <div className="flex size-full items-center justify-center text-[#b0b8c1]">
              <ImageIcon className="size-6" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5">
            <MarketIntentOwnershipChip kind="neighbor" label={neighborBadge} size="xs" />
          </div>
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-[16px] font-semibold leading-snug text-[#191f28]">
              {row.title}
            </p>
            <span
              className="shrink-0 text-[20px] font-bold tabular-nums leading-none text-[#3182f6]"
              aria-label={scoreAria(row.scorePct)}
            >
              {row.scorePct}
              <span className="text-[12px] font-semibold">%</span>
            </span>
          </div>
          <p className="mt-0.5 truncate text-[14px] text-[#6b7684]">
            {row.priceLine}
            <span className="mx-1.5 text-[#d1d6db]">·</span>
            {row.conditionLabel}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-[#3182f6]">
            {row.distanceKm != null && row.distanceKm <= 8 ? (
              <MapPin className="size-3.5 shrink-0 opacity-80" aria-hidden />
            ) : null}
            <span>{row.reasonKo}</span>
          </p>
        </div>
      </button>

      <div className="relative mt-2.5 pl-[64px]">
        <div
          ref={scrollRef}
          onScroll={updateFilmFade}
          onPointerDown={(event) => event.stopPropagation()}
          className={cn(
            "-mr-4 flex gap-2 overflow-x-auto overflow-y-hidden scroll-smooth pr-4",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "[touch-action:pan-x] overscroll-x-contain",
            FILM_H,
          )}
          aria-label={swipeHint}
        >
          {segments.map((segment, index) => (
            <FilmTile
              key={segmentKey(segment, index)}
              segment={segment}
              storyTitle={storyTitle}
              storyEmpty={storyEmpty}
              noMediaLabel={copy.globe.field.cardFilmNoMedia}
              heroBadge={copy.globe.field.cardFilmHeroBadge}
              isHero={index === 0 && (segment.type === "media" || segment.type === "placeholder")}
            />
          ))}
        </div>

        {showFilmFade ? (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-gradient-to-l from-white via-white/90 to-transparent"
            aria-hidden
          >
            <ChevronRight className="size-4 text-[#b0b8c1]" />
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}

function segmentKey(segment: OpportunityCardFilmSegment, index: number): string {
  if (segment.type === "media") {
    return `media-${segment.item.kind}-${segment.item.url}-${index}`;
  }
  if (segment.type === "placeholder") {
    return `placeholder-${index}`;
  }
  return `story-${index}`;
}

function FilmTile({
  segment,
  storyTitle,
  storyEmpty,
  noMediaLabel,
  heroBadge,
  isHero,
}: {
  segment: OpportunityCardFilmSegment;
  storyTitle: string;
  storyEmpty: string;
  noMediaLabel: string;
  heroBadge: string;
  isHero: boolean;
}) {
  if (segment.type === "placeholder") {
    return (
      <div
        className={cn(
          "relative flex shrink-0 flex-col items-center justify-center gap-1.5 bg-[#f2f4f6]",
          FILM_H,
          "w-[min(62vw,220px)]",
        )}
      >
        <ImageIcon className="size-7 text-[#b0b8c1]" aria-hidden />
        <span className="text-[12px] font-medium text-[#8b95a1]">{noMediaLabel}</span>
        {isHero ? (
          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white">
            {heroBadge}
          </span>
        ) : null}
      </div>
    );
  }

  if (segment.type === "media") {
    const widthClass = isHero ? "w-[min(62vw,220px)]" : "w-[120px]";
    return (
      <div className={cn("relative shrink-0 overflow-hidden bg-[#e8eaed]", FILM_H, widthClass)}>
        {segment.item.kind === "video" ? (
          <FilmVideoTile url={segment.item.url} prominent={isHero} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={segment.item.url}
            alt=""
            className="size-full object-cover"
            draggable={false}
          />
        )}
        {isHero ? (
          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white">
            {heroBadge}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden bg-[#f8f9fb] px-3 py-2.5",
        FILM_H,
        "w-[min(72vw,260px)]",
      )}
    >
      <div className="h-full overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <p className="text-[11px] font-semibold text-[#8b95a1]">{storyTitle}</p>
        {segment.detailNote ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#191f28] line-clamp-3 whitespace-pre-wrap">
            {segment.detailNote}
          </p>
        ) : segment.memoryLine ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#191f28] line-clamp-3">
            {segment.memoryLine}
          </p>
        ) : (
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b7684]">{storyEmpty}</p>
        )}
        {segment.matchReasons.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {segment.matchReasons.slice(0, 3).map((reason) => (
              <li key={reason} className="flex items-center gap-1.5 text-[12px] text-[#4e5968]">
                <Check className="size-3 shrink-0 text-[#3182f6]" aria-hidden />
                <span className="truncate">{reason}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function FilmVideoTile({ url, prominent }: { url: string; prominent: boolean }) {
  const copy = useCopy();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative size-full bg-[#191f28]">
      <video
        ref={videoRef}
        src={url}
        playsInline
        preload="metadata"
        muted={!playing}
        controls={playing}
        className="size-full object-cover"
        onEnded={() => setPlaying(false)}
      />
      {!playing ? (
        <button
          type="button"
          className="absolute inset-0 flex items-center justify-center bg-black/20"
          onClick={(event) => {
            event.stopPropagation();
            const el = videoRef.current;
            if (!el) {
              return;
            }
            el.muted = false;
            setPlaying(true);
            void el.play();
          }}
          aria-label={copy.globe.marketListingMediaPlayAria}
        >
          <span
            className={cn(
              "flex items-center justify-center rounded-full bg-white/25 ring-1 ring-white/30",
              prominent ? "size-10" : "size-8",
            )}
          >
            <Play
              className={cn("fill-white text-white", prominent ? "size-4" : "size-3.5")}
              aria-hidden
            />
          </span>
        </button>
      ) : null}
    </div>
  );
}

export function OpportunityCardShimmer() {
  return (
    <div className="space-y-0">
      {[0, 1, 2].map((key) => (
        <div key={key} className="border-b border-[#f2f4f6] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="size-[52px] shrink-0 animate-pulse rounded-2xl bg-[#f2f4f6]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/5 animate-pulse rounded-md bg-[#f2f4f6]" />
              <div className="h-3.5 w-4/5 animate-pulse rounded-md bg-[#f2f4f6]" />
              <div className="h-3 w-2/5 animate-pulse rounded-md bg-[#f2f4f6]" />
            </div>
            <div className="h-7 w-11 animate-pulse rounded-md bg-[#f2f4f6]" />
          </div>
          <div className="mt-2.5 flex gap-2 overflow-hidden pl-[64px]">
            <div className={cn("w-[220px] shrink-0 animate-pulse bg-[#f2f4f6]", FILM_H)} />
            <div className={cn("w-[120px] shrink-0 animate-pulse bg-[#f2f4f6]", FILM_H)} />
            <div className={cn("w-[260px] shrink-0 animate-pulse bg-[#f2f4f6]", FILM_H)} />
          </div>
        </div>
      ))}
    </div>
  );
}
