import { buildMarketListingMediaItems } from "@/lib/globe/market/market-listing-media";
import type { MarketListingMediaItem } from "@/lib/globe/market/market-listing-media";
import { formatMarketMemoryPreview } from "@/lib/globe/market/memory/format-market-memory-preview";
import type { OpportunityRow } from "@/lib/globe/opportunity-field/types";

export type OpportunityCardFilmMediaSegment = {
  type: "media";
  item: MarketListingMediaItem;
};

export type OpportunityCardFilmPlaceholderSegment = {
  type: "placeholder";
};

export type OpportunityCardFilmStorySegment = {
  type: "story";
  detailNote: string;
  memoryLine: string | null;
  matchReasons: readonly string[];
};

export type OpportunityCardFilmSegment =
  | OpportunityCardFilmMediaSegment
  | OpportunityCardFilmPlaceholderSegment
  | OpportunityCardFilmStorySegment;

function resolveListingMedia(row: OpportunityRow): MarketListingMediaItem[] {
  const fromDetail = buildMarketListingMediaItems(row.listing.detail);
  if (fromDetail.length > 0) {
    return fromDetail;
  }
  const video = row.videoUrl?.trim();
  if (video) {
    return [{ kind: "video", url: video }];
  }
  const photo = row.photoUrl?.trim();
  if (photo) {
    return [{ kind: "photo", url: photo }];
  }
  return [];
}

/** One continuous horizontal film — media panels then story panel. */
export function buildOpportunityCardFilm(row: OpportunityRow): OpportunityCardFilmSegment[] {
  const media = resolveListingMedia(row);
  const segments: OpportunityCardFilmSegment[] = media.map((item) => ({
    type: "media",
    item,
  }));

  if (segments.length === 0) {
    segments.push({ type: "placeholder" });
  }

  const detailNote = row.listing.detail.detailNote?.trim() ?? "";
  const memoryLine = formatMarketMemoryPreview(row.listing.detail, "listing");
  segments.push({
    type: "story",
    detailNote,
    memoryLine,
    matchReasons: row.matchReasons,
  });

  return segments;
}
