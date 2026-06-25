"use client";

import { motion } from "framer-motion";
import { ImageIcon } from "lucide-react";
import { MarketListingMediaRowThumb } from "@/components/market/market-listing-media-thumb";
import type { OpportunityRow } from "@/lib/globe/opportunity-field";
import { formatPeerChatListTime } from "@/lib/peer-chat/format-peer-chat-list-time";
import { PEERS_CHAT_LIST } from "@/lib/peer-chat/peers-chat-list-density";
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

export function OpportunityRowItem({
  row,
  onPress,
  scoreAria,
  previewFallback,
  className,
}: OpportunityRowItemProps) {
  const timeLabel = formatPeerChatListTime(row.listing.confirmedAtIso);
  const preview = formatOpportunityListPreview(row, previewFallback);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("border-b border-[#f2f4f6]", className)}
      data-opportunity-row={row.listingId}
      data-opportunity-ownership="neighbor"
    >
      <button
        type="button"
        onClick={onPress}
        className={cn(PEERS_CHAT_LIST.row, "w-full text-left")}
      >
        <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-[#f2f4f6] ring-1 ring-black/[0.04]">
          {row.photoUrl || row.videoUrl ? (
            <MarketListingMediaRowThumb photoUrl={row.photoUrl} videoUrl={row.videoUrl} />
          ) : (
            <span className="flex size-full items-center justify-center text-[#b0b8c1]">
              <ImageIcon className="size-5" aria-hidden />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className={cn("min-w-0 flex-1 truncate", PEERS_CHAT_LIST.name)}>{row.title}</p>
            {timeLabel ? (
              <span className={PEERS_CHAT_LIST.time}>{timeLabel}</span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <p className={cn("min-w-0 flex-1 truncate", PEERS_CHAT_LIST.contextPreview)}>
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
    </motion.li>
  );
}

export function OpportunityRowShimmer() {
  return (
    <ul className="bg-white" aria-hidden>
      {[0, 1, 2, 3].map((key) => (
        <li key={key} className="border-b border-[#f2f4f6]">
          <div className={PEERS_CHAT_LIST.row}>
            <div className="size-10 shrink-0 animate-pulse rounded-full bg-[#f2f4f6]" />
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
