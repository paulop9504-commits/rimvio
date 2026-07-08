import { buildResourceReelResourceId } from "@/lib/globe/resource-reel/globe-resource-reel-bridge";
import type { GlobeResourceReelItem } from "@/lib/globe/resource-reel/types";
import type { LensPrefetchBundle } from "@/lib/globe/discovery-lens/types";
import { copy } from "@/lib/copy/human-ko";
import { buildGoogleMapsPlaceHref } from "@/lib/resolvers/deep-links";
import {
  activitySubtypeActionLabel,
  activitySubtypeNoun,
} from "@/lib/globe/place/activity-subtype-presentation";

function scoreFromRank(index: number, total: number): number {
  if (total <= 1) {
    return 92;
  }
  return Math.max(68, Math.round(92 - (index / Math.max(total - 1, 1)) * 24));
}

function accentForItem(
  kind: GlobeResourceReelItem["kind"],
  index: number,
): GlobeResourceReelItem["accent"] {
  if (index === 0) {
    return kind === "lodging" ? "green" : kind === "amenity" ? "blue" : "orange";
  }
  if (index === 1) {
    return "blue";
  }
  if (index === 2) {
    return "purple";
  }
  return kind === "lodging" ? "green" : kind === "amenity" ? "blue" : "orange";
}

function formatPriceKrw(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

export function buildGlobeResourceReelItemsFromLensPrefetch(input: {
  contextEventId: string;
  lensLabel: string;
  bundle: LensPrefetchBundle;
}): GlobeResourceReelItem[] {
  if (input.bundle.status !== "ready" || input.bundle.items.length === 0) {
    return [];
  }

  const total = input.bundle.items.length;
  return input.bundle.items.map((row, index) => {
    const meta = [
      row.kind === "activity"
        ? activitySubtypeNoun(row.activitySubtype ?? "general")
        : row.kind === "lodging"
          ? formatPriceKrw(row.priceKrw)
          : null,
      typeof row.rating === "number" ? `평점 ${row.rating.toFixed(1)}` : null,
      row.openNow == null ? null : row.openNow ? "영업 중" : "영업 종료",
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      resourceId: buildResourceReelResourceId({
        contextEventId: input.contextEventId,
        kind: row.kind,
        placeId: row.placeId,
      }),
      kind: row.kind,
      activitySubtype: row.kind === "activity" ? (row.activitySubtype ?? null) : null,
      placeId: row.placeId,
      title: row.title,
      score100: scoreFromRank(index, total),
      detailReasonLine: row.reasonKo,
      accent: accentForItem(row.kind, index),
      thumbnailUrl: row.thumbnailUrl ?? null,
      lat: row.lat,
      lng: row.lng,
      carouselIndex: index,
      secondaryLine: meta || input.lensLabel,
      actionHref:
        row.mapsUrl?.trim() ||
        buildGoogleMapsPlaceHref({
          lat: row.lat,
          lng: row.lng,
          placeId: row.placeId,
          placeLabel: row.title,
        }),
      actionLabel:
        row.kind === "lodging"
          ? copy.globe.lodgingFocusBook
          : row.kind === "activity"
            ? activitySubtypeActionLabel(row.activitySubtype ?? "general")
            : copy.globe.eateryFocusNavigate,
    };
  });
}
