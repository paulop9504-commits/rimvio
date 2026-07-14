import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { hasEateryDomainCue } from "@/lib/globe/domain-cues/eatery-domain-cues";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";
import { hasFoodBrandCue } from "@/lib/globe/context-condition-ai/parse-food-brand-focus";
import { utteranceHasConcreteDishSlot } from "@/lib/globe/context-condition-ai/utterance-intent-slots";
import { parseCuisineCandidates } from "@/lib/globe/context-condition-ai/parse-cuisine-candidates";
import {
  entitiesImplyEatery,
  entitiesImplyLodging,
  resolveEntities,
  type EntityResolveResult,
  type ResolvedEntity,
} from "@/lib/entity-resolver";

export type ContextConditionAnchorPinIntent = {
  lodgingSimilar: boolean;
  eateryNearby: boolean;
  lodgingMode: "nearby" | "similar_price" | null;
};

const LODGING_NEARBY_HINT =
  /주변|근처|nearby|찾|검색|추천|배치|꽂|pin|探|近く/iu;
const LODGING_SIMILAR_PRICE_HINT = /비슷한|같은\s*가격|비슷한\s*가격|similar\s*price/iu;
const BOTH_HINT = /꽂|배치|찾|추천|주변|nearby|pin/iu;
const FOOD_ADJACENT_HINT =
  /^(?:음료|음료수|드링크|drink|beverage|커피|coffee|카페|cafe|차|주스|juice|스무디|smoothie|디저트|dessert|베이커리|bakery|간식|snack)$/iu;

function hasConcreteEateryIntent(text: string): boolean {
  return (
    hasFoodBrandCue(text) ||
    utteranceHasConcreteDishSlot(text) ||
    parseCuisineCandidates(text).length > 0 ||
    hasEateryDomainCue(text)
  );
}

export function classifyContextConditionAnchorRequestFromEntities(
  entities: readonly ResolvedEntity[],
  message?: string | null,
): ContextConditionAnchorPinIntent {
  const text = message?.trim() ?? "";
  const lodgingSimilar =
    entitiesImplyLodging(entities) ||
    hasLodgingDomainCue(text) ||
    LODGING_SIMILAR_PRICE_HINT.test(text);
  const eateryNearby = entitiesImplyEatery(entities) || hasEateryDomainCue(text);
  if (lodgingSimilar && !eateryNearby) {
    return { lodgingSimilar: true, eateryNearby: false, lodgingMode: "nearby" };
  }
  if (eateryNearby && !lodgingSimilar) {
    return { lodgingSimilar: false, eateryNearby: true, lodgingMode: null };
  }
  if (!text) {
    return { lodgingSimilar: true, eateryNearby: true, lodgingMode: "nearby" };
  }
  return classifyContextConditionAnchorRequest(text);
}

export function classifyContextConditionAnchorRequest(
  message: string | null | undefined,
): ContextConditionAnchorPinIntent {
  const text = message?.trim() ?? "";
  if (!text) {
    return { lodgingSimilar: true, eateryNearby: true, lodgingMode: "nearby" };
  }
  const resolved = resolveEntities(text);
  if (resolved.entities.length > 0) {
    const lodgingSimilar =
      entitiesImplyLodging(resolved.entities) ||
      hasLodgingDomainCue(text) ||
      LODGING_SIMILAR_PRICE_HINT.test(text);
    const eateryNearby =
      entitiesImplyEatery(resolved.entities) || hasEateryDomainCue(text);
    const lodgingMode = LODGING_SIMILAR_PRICE_HINT.test(text)
      ? "similar_price"
      : lodgingSimilar && LODGING_NEARBY_HINT.test(text)
        ? "nearby"
        : lodgingSimilar
          ? "nearby"
          : null;
    if (lodgingSimilar && !eateryNearby) {
      return { lodgingSimilar: true, eateryNearby: false, lodgingMode };
    }
    if (eateryNearby && !lodgingSimilar) {
      return { lodgingSimilar: false, eateryNearby: true, lodgingMode: null };
    }
    if (
      !lodgingSimilar &&
      !eateryNearby &&
      resolved.entities.some(
        (row) => row.kind === "Station" || row.kind === "Airport",
      )
    ) {
      return { lodgingSimilar: false, eateryNearby: false, lodgingMode: null };
    }
    if (!lodgingSimilar && !eateryNearby) {
      if (BOTH_HINT.test(text)) {
        return { lodgingSimilar: true, eateryNearby: true, lodgingMode: "nearby" };
      }
      if (FOOD_ADJACENT_HINT.test(text)) {
        return { lodgingSimilar: false, eateryNearby: true, lodgingMode: null };
      }
      return { lodgingSimilar: true, eateryNearby: true, lodgingMode: "nearby" };
    }
    return { lodgingSimilar, eateryNearby, lodgingMode };
  }

  const lodgingSimilar =
    hasLodgingDomainCue(text) || LODGING_SIMILAR_PRICE_HINT.test(text);
  const eateryNearby = hasConcreteEateryIntent(text);
  const lodgingMode = LODGING_SIMILAR_PRICE_HINT.test(text)
    ? "similar_price"
    : lodgingSimilar && LODGING_NEARBY_HINT.test(text)
      ? "nearby"
      : lodgingSimilar
        ? "nearby"
        : null;
  if (eateryNearby && !lodgingSimilar) {
    return { lodgingSimilar: false, eateryNearby: true, lodgingMode: null };
  }
  if (!lodgingSimilar && !eateryNearby) {
    if (BOTH_HINT.test(text)) {
      return { lodgingSimilar: true, eateryNearby: true, lodgingMode: "nearby" };
    }
    if (FOOD_ADJACENT_HINT.test(text)) {
      return { lodgingSimilar: false, eateryNearby: true, lodgingMode: null };
    }
    return { lodgingSimilar: true, eateryNearby: true, lodgingMode: "nearby" };
  }
  return { lodgingSimilar, eateryNearby, lodgingMode };
}

export type { EntityResolveResult };

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
