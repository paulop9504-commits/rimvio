import { buildMarketListingMediaItems } from "@/lib/globe/market/market-listing-media";
import type { MarketListingMediaItem } from "@/lib/globe/market/market-listing-media";
import { formatMarketMemoryPreview } from "@/lib/globe/market/memory/format-market-memory-preview";
import type { OpportunityRow } from "@/lib/globe/opportunity-field/types";

export type OpportunityCardFilmMediaSegment = {
  type: "media";
  item: MarketListingMediaItem;
};

export type OpportunityCardFilmStorySegment = {
  type: "story";
  detailNote: string;
  memoryLine: string | null;
  matchReasons: readonly string[];
};

export type OpportunityCardFilmSegment =
  | OpportunityCardFilmMediaSegment
  | OpportunityCardFilmStorySegment;

/** One continuous horizontal film — media panels then story panel. */
export function buildOpportunityCardFilm(row: OpportunityRow): OpportunityCardFilmSegment[] {
  const media = buildMarketListingMediaItems(row.listing.detail);
  const segments: OpportunityCardFilmSegment[] = media.map((item) => ({
    type: "media",
    item,
  }));

  const detailNote = row.listing.detail.detailNote?.trim() ?? "";
  const memoryLine = formatMarketMemoryPreview(row.listing.detail, "listing");
  const hasStory =
    detailNote.length > 0 || Boolean(memoryLine) || row.matchReasons.length > 0;

  if (hasStory || segments.length === 0) {
    segments.push({
      type: "story",
      detailNote,
      memoryLine,
      matchReasons: row.matchReasons,
    });
  }

  return segments;
}
