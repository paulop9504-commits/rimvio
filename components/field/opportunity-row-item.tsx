"use client";

import { motion } from "framer-motion";
import { ImageIcon, MapPin } from "lucide-react";
import type { OpportunityRow } from "@/lib/globe/opportunity-field";
import { cn } from "@/lib/utils";

export type OpportunityRowItemProps = {
  row: OpportunityRow;
  onPress: () => void;
  scoreAria: (pct: number) => string;
  className?: string;
};

export function OpportunityRowItem({
  row,
  onPress,
  scoreAria,
  className,
}: OpportunityRowItemProps) {
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.22 }}
      onClick={onPress}
      className={cn(
        "flex w-full items-center gap-3 border-b border-[#f2f4f6] px-4 py-3.5 text-left transition-colors active:bg-[#f8f9fb]",
        className,
      )}
      data-opportunity-row={row.listingId}
    >
      <div className="relative size-[52px] shrink-0 overflow-hidden rounded-2xl bg-[#f2f4f6] ring-1 ring-black/[0.04]">
        {row.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.photoUrl}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[#b0b8c1]">
            <ImageIcon className="size-6" aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold leading-snug text-[#191f28]">
          {row.title}
        </p>
        <p className="mt-0.5 text-[14px] font-medium text-[#191f28]">
          {row.priceLine}
          <span className="mx-1.5 text-[#d1d6db]">·</span>
          <span className="font-normal text-[#6b7684]">{row.conditionLabel}</span>
        </p>
        <p className="mt-1 flex items-center gap-1 text-[13px] text-[#3182f6]">
          {row.distanceKm != null && row.distanceKm <= 8 ? (
            <MapPin className="size-3.5 shrink-0 opacity-80" aria-hidden />
          ) : null}
          <span className="truncate">{row.reasonKo}</span>
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5 pl-1">
        <span
          className="text-[22px] font-bold tabular-nums leading-none text-[#3182f6]"
          aria-label={scoreAria(row.scorePct)}
        >
          {row.scorePct}
          <span className="text-[13px] font-semibold">%</span>
        </span>
      </div>
    </motion.button>
  );
}

export function OpportunityRowShimmer() {
  return (
    <div className="space-y-0">
      {[0, 1, 2, 3].map((key) => (
        <div
          key={key}
          className="flex items-center gap-3 border-b border-[#f2f4f6] px-4 py-3.5"
        >
          <div className="size-[52px] shrink-0 animate-pulse rounded-2xl bg-[#f2f4f6]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/5 animate-pulse rounded-md bg-[#f2f4f6]" />
            <div className="h-3.5 w-4/5 animate-pulse rounded-md bg-[#f2f4f6]" />
            <div className="h-3 w-2/5 animate-pulse rounded-md bg-[#f2f4f6]" />
          </div>
          <div className="h-7 w-12 animate-pulse rounded-md bg-[#f2f4f6]" />
        </div>
      ))}
    </div>
  );
}
