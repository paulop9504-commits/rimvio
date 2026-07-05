import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";

export type ContextConditionAnchorPinIntent = {
  lodgingSimilar: boolean;
  eateryNearby: boolean;
  /** nearby = 주변/찾아줘 · similar_price = 비슷한 가격 */
  lodgingMode: "nearby" | "similar_price" | null;
};

const LODGING_HINT =
  /비슷한|같은\s*가격|비슷한\s*가격|숙소|호텔|stay|hotel|lodging|宿|ホテル/iu;
const LODGING_NEARBY_HINT =
  /주변|근처|nearby|찾|검색|추천|배치|꽂|pin|探|近く/iu;
const LODGING_SIMILAR_PRICE_HINT = /비슷한|같은\s*가격|비슷한\s*가격|similar\s*price/iu;
const EATERY_HINT =
  /맛집|먹을|식당|밥|brunch|lunch|dinner|food|eatery|restaurant|카페|ラーメン|食/iu;
const BOTH_HINT = /꽂|배치|찾|추천|주변|nearby|pin/iu;

/** Parse anchor prompt into lodging/eatery condition axes — no Globe composer routing. */
export function classifyContextConditionAnchorRequest(
  message: string | null | undefined,
): ContextConditionAnchorPinIntent {
  const text = message?.trim() ?? "";
  if (!text) {
    return { lodgingSimilar: true, eateryNearby: true, lodgingMode: "nearby" };
  }
  const lodgingSimilar = LODGING_HINT.test(text);
  const eateryNearby = EATERY_HINT.test(text);
  const lodgingMode = LODGING_SIMILAR_PRICE_HINT.test(text)
    ? "similar_price"
    : lodgingSimilar && LODGING_NEARBY_HINT.test(text)
      ? "nearby"
      : lodgingSimilar
        ? "nearby"
        : null;
  if (!lodgingSimilar && !eateryNearby) {
    return BOTH_HINT.test(text)
      ? { lodgingSimilar: true, eateryNearby: true, lodgingMode: "nearby" }
      : { lodgingSimilar: true, eateryNearby: true, lodgingMode: "nearby" };
  }
  return { lodgingSimilar, eateryNearby, lodgingMode };
}

export function filterLodgingRowsForContextCondition(input: {
  rows: readonly ContextLodgingInventoryRow[];
  anchorPlaceId: string;
  anchorPriceKrw?: number | null;
  lodgingMode?: "nearby" | "similar_price" | null;
  max?: number;
}): ContextLodgingInventoryRow[] {
  const max = input.max ?? 4;
  const exclude = input.anchorPlaceId.trim();
  const filtered = input.rows.filter((row) => {
    const placeId = row.placeId.trim();
    if (!placeId) {
      return false;
    }
    if (exclude && placeId === exclude) {
      return false;
    }
    if (exclude.startsWith("context-center:")) {
      return true;
    }
    return placeId !== exclude;
  });
  if (input.lodgingMode !== "similar_price") {
    return filtered.slice(0, max);
  }
  return filterLodgingRowsSimilarToAnchor({
    rows: filtered,
    anchorPlaceId: exclude,
    anchorPriceKrw: input.anchorPriceKrw,
    max,
  });
}

export function filterLodgingRowsSimilarToAnchor(input: {
  rows: readonly ContextLodgingInventoryRow[];
  anchorPlaceId: string;
  anchorPriceKrw?: number | null;
  max?: number;
}): ContextLodgingInventoryRow[] {
  const max = input.max ?? 3;
  const exclude = input.anchorPlaceId.trim();
  const filtered = input.rows.filter((row) => row.placeId.trim() !== exclude);
  const price = input.anchorPriceKrw;
  if (price == null || !Number.isFinite(price) || price <= 0) {
    return filtered.slice(0, max);
  }
  const min = price * 0.65;
  const maxPrice = price * 1.35;
  const priced = filtered.filter(
    (row) =>
      row.priceKrw != null &&
      Number.isFinite(row.priceKrw) &&
      row.priceKrw >= min &&
      row.priceKrw <= maxPrice,
  );
  return (priced.length > 0 ? priced : filtered).slice(0, max);
}
