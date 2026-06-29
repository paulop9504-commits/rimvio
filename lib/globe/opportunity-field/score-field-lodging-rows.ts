import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { explainLodgingRecommendationKo } from "@/lib/globe/lodging/explain-lodging-recommendation-ko";

export type ScoredFieldLodgingRow = {
  row: ContextLodgingInventoryRow;
  score: number;
  reasonKo: string;
  matchReasons: string[];
  distanceKm: number | null;
};

export function scoreFieldLodgingRows(input: {
  rows: readonly ContextLodgingInventoryRow[];
  lat: number | null;
  lng: number | null;
}): ScoredFieldLodgingRow[] {
  const scored = input.rows.map((row, index) => {
    const distanceKm =
      input.lat != null && input.lng != null
        ? haversineKm(input.lat, input.lng, row.lat, row.lng)
        : null;
    let score = 100 - index;
    if (distanceKm != null) {
      if (distanceKm <= 1) {
        score += 80;
      } else if (distanceKm <= 3) {
        score += 55;
      } else if (distanceKm <= 8) {
        score += 25;
      }
    }
    if (row.priceKrw != null && row.priceKrw <= 90_000) {
      score += 15;
    }

    const explained = explainLodgingRecommendationKo({
      rankIndex: index,
      distanceKm,
      priceKrw: row.priceKrw ?? null,
    });

    return {
      row,
      score,
      reasonKo: explained.reasonKo,
      matchReasons: explained.matchReasons,
      distanceKm,
    };
  });

  scored.sort((left, right) => right.score - left.score);
  return scored;
}

export function formatFieldLodgingPriceLine(
  priceKrw: number | null | undefined,
): string | null {
  if (priceKrw == null || !Number.isFinite(priceKrw)) {
    return null;
  }
  if (priceKrw >= 10_000) {
    return `${Math.round(priceKrw / 10_000)}만원대`;
  }
  return `${Math.round(priceKrw).toLocaleString("ko-KR")}원`;
}
