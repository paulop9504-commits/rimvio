"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronRight, MapPin } from "lucide-react";
import { OpportunityRowMediaAutoplay } from "@/components/field/opportunity-row-media-autoplay";
import { useCopy } from "@/hooks/use-copy";
import { useRegionalProfile } from "@/hooks/use-regional-profile";
import { formatRegionalDistance } from "@/lib/format/format-regional-distance";
import { formatMarketPlaceLabel } from "@/lib/globe/market/format-market-place-label";
import { formatMarketMemoryPreview } from "@/lib/globe/market/memory/format-market-memory-preview";
import type { OpportunityRow } from "@/lib/globe/opportunity-field";
import { formatPeerChatListTime } from "@/lib/peer-chat/format-peer-chat-list-time";
import { cn } from "@/lib/utils";

export type OpportunityRowItemProps = {
  row: OpportunityRow;
  onPress: () => void;
  scoreAria: (pct: number) => string;
  previewFallback: string;
  className?: string;
};

function formatOpportunityListPreview(row: OpportunityRow, fallback: string): string {
  const price = row.priceLine.trim();
  const reason = row.reasonKo.trim();
  if (price && reason) {
    return `${price} · ${reason}`;
  }
  return price || reason || fallback;
}

const ROW_H = "min-h-[68px]";
const THUMB = "size-[44px] shrink-0 overflow-hidden rounded-xl ring-1 ring-black/[0.05]";

export function OpportunityRowItem({
  row,
  onPress,
  scoreAria,
  previewFallback,
  className,
}: OpportunityRowItemProps) {
  const copy = useCopy();
  const field = copy.globe.field;
  const { profile } = useRegionalProfile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0 });
  const [showPeekHint, setShowPeekHint] = useState(false);

  const timeLabel = formatPeerChatListTime(row.listing.confirmedAtIso);
  const preview = formatOpportunityListPreview(row, previewFallback);
  const placeLabel = formatMarketPlaceLabel(row.listing.placeLabel);
  const memoryLine = formatMarketMemoryPreview(row.listing.detail, "listing");
  const detailNote = row.listing.detail.detailNote?.trim() ?? "";
  const distanceLabel =
    row.distanceKm != null ? formatRegionalDistance(row.distanceKm, profile) : null;

  const updatePeekHint = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setShowPeekHint(max > 12 && el.scrollLeft < max - 12);
  }, []);

  useEffect(() => {
    updatePeekHint();
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(() => updatePeekHint());
    observer.observe(el);
    return () => observer.disconnect();
  }, [updatePeekHint]);

  const handleMainPress = useCallback(() => {
    const el = scrollRef.current;
    if (el && el.scrollLeft > 12) {
      el.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    onPress();
  }, [onPress]);

  return (
    <motion.li
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn("relative border-b border-[#f2f4f6] bg-white", className)}
      data-opportunity-row={row.listingId}
      data-opportunity-ownership="neighbor"
    >
      <div
        ref={scrollRef}
        onScroll={updatePeekHint}
        className={cn(
          "flex overflow-x-auto overscroll-x-contain",
          "snap-x snap-mandatory scroll-smooth",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "[touch-action:pan-x]",
        )}
        aria-label={field.cardFilmSwipeHint}
      >
        <div className={cn("relative w-full shrink-0 snap-start snap-always", ROW_H)}>
          <button
            type="button"
            onClick={handleMainPress}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-2 text-left active:bg-[#f8f9fb]",
              ROW_H,
            )}
          >
            <span className={THUMB}>
              <OpportunityRowMediaAutoplay
                photoUrl={row.photoUrl}
                videoUrl={row.videoUrl}
                detail={row.listing.detail}
                className="size-full"
              />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight text-[#191f28]">
                  {row.title}
                </p>
                {timeLabel ? (
                  <span className="shrink-0 text-[11px] tabular-nums text-[#8b95a1]">
                    {timeLabel}
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[13px] leading-snug text-[#3182f6]">
                  {preview}
                </p>
                <span
                  className="shrink-0 text-[11px] font-bold tabular-nums text-[#3182f6]"
                  aria-label={scoreAria(row.scorePct)}
                >
                  {row.scorePct}%
                </span>
              </div>
            </div>
          </button>

          {showPeekHint ? (
            <div
              className="pointer-events-none absolute inset-y-0 right-0 flex w-8 items-center justify-end bg-gradient-to-l from-white via-white/85 to-transparent pr-1"
              aria-hidden
            >
              <ChevronRight className="size-3.5 text-[#b0b8c1]" />
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "flex w-[min(74vw,268px)] shrink-0 snap-start snap-always flex-col justify-center",
            "border-l border-[#eef1f4] bg-[#f8f9fb]/90 px-3.5 py-2.5",
            ROW_H,
          )}
          onPointerDown={(event) => {
            dragRef.current = {
              active: true,
              startX: event.clientX,
              startScroll: scrollRef.current?.scrollLeft ?? 0,
            };
          }}
          onPointerUp={(event) => {
            if (!dragRef.current.active) {
              return;
            }
            dragRef.current.active = false;
            const delta = Math.abs(event.clientX - dragRef.current.startX);
            if (delta < 8) {
              onPress();
            }
          }}
        >
          <p className="text-[11px] font-semibold text-[#8b95a1]">{field.cardStoryTitle}</p>
          <p className="mt-1 text-[14px] font-bold tabular-nums text-[#191f28]">{row.priceLine}</p>
          <p className="mt-0.5 truncate text-[12px] text-[#6b7684]">
            {row.conditionLabel}
            {placeLabel ? (
              <>
                <span className="mx-1 text-[#d1d6db]">·</span>
                {placeLabel}
              </>
            ) : null}
          </p>
          {detailNote || memoryLine ? (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#4e5968]">
              {detailNote || memoryLine}
            </p>
          ) : (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#6b7684]">
              {field.cardStoryEmpty}
            </p>
          )}
          {row.matchReasons.length > 0 ? (
            <ul className="mt-1.5 space-y-0.5">
              {row.matchReasons.slice(0, 3).map((reason) => (
                <li key={reason} className="flex items-center gap-1 text-[11px] text-[#3182f6]">
                  <Check className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{reason}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {distanceLabel ? (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-[#6b7684]">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span>{distanceLabel}</span>
            </p>
          ) : null}
        </div>
      </div>
    </motion.li>
  );
}

export function OpportunityRowShimmer() {
  return (
    <ul className="bg-white" aria-hidden>
      {[0, 1, 2, 3].map((key) => (
        <li key={key} className="border-b border-[#f2f4f6]">
          <div className={cn("flex items-center gap-3 px-4 py-2", ROW_H)}>
            <div className={cn("animate-pulse bg-[#f2f4f6]", THUMB)} />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex justify-between gap-2">
                <div className="h-4 w-2/5 animate-pulse rounded-md bg-[#f2f4f6]" />
                <div className="h-3 w-10 animate-pulse rounded-md bg-[#f2f4f6]" />
              </div>
              <div className="flex justify-between gap-2">
                <div className="h-3.5 w-3/5 animate-pulse rounded-md bg-[#f2f4f6]" />
                <div className="h-3.5 w-8 animate-pulse rounded-md bg-[#f2f4f6]" />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
