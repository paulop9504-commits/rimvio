import { resolveMarketCategoryId } from "@/lib/globe/market/market-category-registry";
import type { MarketCategoryId } from "@/lib/globe/market/market-intent-types";
import { MARKET_QUESTION_PROFILES } from "@/lib/globe/market/question-engine/market-question-profiles";
import type { MarketQuestionEngineCategorySlug } from "@/lib/globe/market/question-engine/types";

const VEHICLE_PATTERN =
  /그랜저|소나타|아반떼|bmw|벤츠|benz|audi|아우디|테슬라|tesla|주행|km|키로|자동차|차량|suv|캠리|포르쉐/iu;

const LAPTOP_PATTERN = /맥북|macbook|노트북|laptop|그램|lg\s*그램|surface/iu;

export function resolveMarketQuestionCategorySlug(input: {
  text: string;
  productName?: string;
  categoryId?: MarketCategoryId;
}): MarketQuestionEngineCategorySlug {
  const corpus = `${input.productName ?? ""} ${input.text}`.trim();
  if (VEHICLE_PATTERN.test(corpus)) {
    return "vehicle";
  }
  if (LAPTOP_PATTERN.test(corpus)) {
    return "laptop";
  }

  const categoryId = input.categoryId ?? resolveMarketCategoryId(corpus);
  switch (categoryId) {
    case "market.phone":
      return "smartphone";
    case "market.camera":
      return "camera";
    case "market.camping":
      return "camping";
    case "market.fashion":
      return "fashion";
    case "market.furniture":
      return "furniture";
    case "market.bike":
      return "bike";
    case "market.instrument":
    case "market.outdoor":
      return "general";
    default:
      return "general";
  }
}

export function resolveMarketQuestionProfile(input: {
  text: string;
  productName?: string;
  categoryId?: MarketCategoryId;
}) {
  const slug = resolveMarketQuestionCategorySlug(input);
  return MARKET_QUESTION_PROFILES[slug];
}
