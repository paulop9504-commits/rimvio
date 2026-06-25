"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronRight, MapPin, MessageCircle, Play } from "lucide-react";
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
  const segments = buildOpportunityCardFilm(row);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<"start" | "middle" | "end">("start");

  const updateEdge = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 4) {
      setEdge("end");
      return;
    }
    if (el.scrollLeft <= 4) {
      setEdge("start");
      return;
    }
    if (el.scrollLeft >= max - 4) {
      setEdge("end");
      return;
    }
    setEdge("middle");
  }, []);

  useEffect(() => {
    updateEdge();
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(() => updateEdge());
    observer.observe(el);
    return () => observer.disconnect();
  }, [segments.length, updateEdge]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className={cn("px-4 pb-4", className)}
      data-opportunity-card={row.listingId}
    >
      <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]">
        <div className="relative bg-[#f5f5f7]">
          <div
            ref={scrollRef}
            onScroll={updateEdge}
            className={cn(
              "flex h-[min(58vw,280px)] overflow-x-auto overflow-y-hidden",
              "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "[touch-action:pan-x] overscroll-x-contain",
            )}
            aria-label={swipeHint}
          >
            {segments.map((segment, index) => (
              <FilmSegment
                key={segmentKey(segment, index)}
                segment={segment}
                storyTitle={storyTitle}
                storyEmpty={storyEmpty}
                isFirst={index === 0}
                heroTitle={index === 0 ? row.title : undefined}
                heroPriceLine={index === 0 ? row.priceLine : undefined}
              />
            ))}
          </div>

          {edge !== "end" ? (
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#f5f5f7] via-[#f5f5f7]/80 to-transparent"
              aria-hidden
            />
          ) : null}
          {edge !== "end" ? (
            <div
              className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-0.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#4e5968] shadow-sm ring-1 ring-black/[0.06] backdrop-blur-sm"
              aria-hidden
            >
              <span>{swipeHint}</span>
              <ChevronRight className="size-3.5 text-[#3182f6]" />
            </div>
          ) : null}
          {edge !== "start" ? (
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#f5f5f7]/90 to-transparent"
              aria-hidden
            />
          ) : null}

          <div
            className="pointer-events-none absolute right-3 top-3 rounded-2xl bg-white/95 px-2.5 py-1.5 shadow-sm ring-1 ring-black/[0.05] backdrop-blur-sm"
            aria-label={scoreAria(row.scorePct)}
          >
            <span className="text-[20px] font-bold tabular-nums leading-none text-[#3182f6]">
              {row.scorePct}
              <span className="text-[12px] font-semibold">%</span>
            </span>
          </div>
        </div>

        <div className="space-y-3 px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <MarketIntentOwnershipChip kind="neighbor" label={neighborBadge} size="xs" />
              <p className="mt-2 flex items-center gap-1 text-[13px] font-medium text-[#3182f6]">
                {row.distanceKm != null && row.distanceKm <= 8 ? (
                  <MapPin className="size-3.5 shrink-0 opacity-80" aria-hidden />
                ) : null}
                <span className="line-clamp-2">{row.reasonKo}</span>
              </p>
              <p className="mt-1 text-[13px] text-[#6b7684]">{row.conditionLabel}</p>
            </div>
            <button
              type="button"
              onClick={onChat}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#3182f6] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm active:scale-[0.98]"
            >
              <MessageCircle className="size-4" aria-hidden />
              {chatCta}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function segmentKey(segment: OpportunityCardFilmSegment, index: number): string {
  if (segment.type === "media") {
    return `media-${segment.item.kind}-${segment.item.url}-${index}`;
  }
  return `story-${index}`;
}

function FilmSegment({
  segment,
  storyTitle,
  storyEmpty,
  isFirst,
  heroTitle,
  heroPriceLine,
}: {
  segment: OpportunityCardFilmSegment;
  storyTitle: string;
  storyEmpty: string;
  isFirst: boolean;
  heroTitle?: string;
  heroPriceLine?: string;
}) {
  if (segment.type === "media") {
    return (
      <div
        className={cn(
          "relative h-full shrink-0 snap-align-none",
          isFirst ? "min-w-full" : "min-w-[94%]",
        )}
      >
        {segment.item.kind === "video" ? (
          <FilmVideoPanel url={segment.item.url} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#f5f5f7] p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={segment.item.url}
              alt=""
              className="max-h-full max-w-full object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
              draggable={false}
            />
          </div>
        )}
        {heroTitle ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent px-4 pb-3 pt-14">
            <p className="truncate text-[18px] font-bold leading-tight text-white drop-shadow-sm">
              {heroTitle}
            </p>
            {heroPriceLine ? (
              <p className="mt-0.5 text-[15px] font-semibold text-white/95">{heroPriceLine}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="h-full min-w-full shrink-0 overflow-y-auto bg-[#f5f5f7] px-5 py-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {heroTitle ? (
        <div className="mb-4 border-b border-black/[0.06] pb-3">
          <p className="text-[18px] font-bold leading-tight text-[#191f28]">{heroTitle}</p>
          {heroPriceLine ? (
            <p className="mt-0.5 text-[15px] font-semibold text-[#3182f6]">{heroPriceLine}</p>
          ) : null}
        </div>
      ) : null}
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8b95a1]">
        {storyTitle}
      </p>
      {segment.detailNote ? (
        <p className="mt-3 text-[15px] leading-relaxed text-[#191f28] whitespace-pre-wrap">
          {segment.detailNote}
        </p>
      ) : segment.memoryLine ? (
        <p className="mt-3 text-[15px] leading-relaxed text-[#191f28]">
          {segment.memoryLine}
        </p>
      ) : (
        <p className="mt-3 text-[14px] leading-relaxed text-[#6b7684]">{storyEmpty}</p>
      )}
      {segment.memoryLine && segment.detailNote ? (
        <p className="mt-3 text-[14px] leading-relaxed text-[#4e5968]">{segment.memoryLine}</p>
      ) : null}
      {segment.matchReasons.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-black/[0.06] pt-4">
          {segment.matchReasons.map((reason) => (
            <li key={reason} className="flex items-center gap-2 text-[13px] text-[#191f28]">
              <Check className="size-3.5 shrink-0 text-[#3182f6]" aria-hidden />
              {reason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FilmVideoPanel({ url }: { url: string }) {
  const copy = useCopy();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[#191f28]">
      <video
        ref={videoRef}
        src={url}
        playsInline
        preload="metadata"
        muted={!playing}
        controls={playing}
        className="max-h-full max-w-full object-contain"
        onEnded={() => setPlaying(false)}
      />
      {!playing ? (
        <button
          type="button"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30"
          onClick={() => {
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
          <span className="flex size-12 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/35 backdrop-blur-sm">
            <Play className="size-6 fill-white text-white" aria-hidden />
          </span>
          <span className="px-4 text-center text-[12px] font-medium text-white/90">
            {copy.globe.marketListingMediaPlayHint}
          </span>
        </button>
      ) : null}
    </div>
  );
}

export function OpportunityCardShimmer() {
  return (
    <div className="pb-2 pt-1">
      {[0, 1].map((key) => (
        <div key={key} className="px-4 pb-4">
          <div className="overflow-hidden rounded-[28px] bg-white ring-1 ring-black/[0.04]">
            <div className="h-[min(58vw,280px)] animate-pulse bg-[#f2f4f6]" />
            <div className="space-y-2 px-4 py-4">
              <div className="h-4 w-24 animate-pulse rounded-full bg-[#f2f4f6]" />
              <div className="h-3.5 w-4/5 animate-pulse rounded-md bg-[#f2f4f6]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
