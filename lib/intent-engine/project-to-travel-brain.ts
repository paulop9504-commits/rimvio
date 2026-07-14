import type { IntentBlueprint, SemanticProfile } from "@/lib/intent-engine/types";
import type {
  TravelBudgetBand,
  TravelCompanionMode,
  TravelContentIntent,
  TravelFoodBias,
  TravelLodgingPriority,
  TravelShoppingIntent,
  TravelTripStyle,
} from "@/lib/situation-projection/travel-brain-personalization";

export type TravelIntentProjection = {
  companionMode: { value: TravelCompanionMode; confidence: number; reasonKo: string } | null;
  lodgingPriority: { value: TravelLodgingPriority; confidence: number; reasonKo: string } | null;
  foodBias: { value: TravelFoodBias; confidence: number; reasonKo: string } | null;
  tripStyle: { value: TravelTripStyle; confidence: number; reasonKo: string } | null;
  budgetBand: { value: TravelBudgetBand; confidence: number; reasonKo: string } | null;
  contentIntent: { value: TravelContentIntent; confidence: number; reasonKo: string } | null;
  shoppingIntent: { value: TravelShoppingIntent; confidence: number; reasonKo: string } | null;
};

/**
 * Project Intent Blueprint → Travel Brain slot suggestions.
 * Planner/engines still own execution; this only proposes closed slots.
 */
export function projectIntentBlueprintToTravel(
  blueprint: IntentBlueprint,
): TravelIntentProjection {
  const ids = new Set(blueprint.intents.map((i) => i.libraryId));
  const p = blueprint.mergedProfile;
  const blendIndieRomantic =
    blueprint.constraints.includes("prefer_indie_romantic_blend") ||
    (ids.has("travel.honeymoon") && ids.has("mood.indie")) ||
    (ids.has("travel.couple") && ids.has("mood.indie"));

  return {
    companionMode: resolveCompanion(ids, p),
    lodgingPriority: resolveLodging(ids, p, blendIndieRomantic),
    foodBias: resolveFood(ids, p, blendIndieRomantic),
    tripStyle: resolveTripStyle(p),
    budgetBand: resolveBudget(p),
    contentIntent: resolveContent(p, blendIndieRomantic),
    shoppingIntent: resolveShopping(p, ids),
  };
}

function resolveCompanion(
  ids: Set<string>,
  p: SemanticProfile,
): TravelIntentProjection["companionMode"] {
  if (ids.has("travel.honeymoon") || ids.has("travel.couple") || (p.romantic ?? 0) >= 0.85) {
    return {
      value: "couple",
      confidence: 0.92,
      reasonKo: "연인·신혼 의도에서 둘 동행으로 읽었어요",
    };
  }
  if (ids.has("travel.family_parents") || (p.family ?? 0) >= 0.9) {
    return {
      value: "parents",
      confidence: 0.93,
      reasonKo: "부모님 동행 의도예요",
    };
  }
  if (ids.has("travel.family")) {
    return {
      value: "family",
      confidence: 0.9,
      reasonKo: "가족 여행 의도예요",
    };
  }
  if (ids.has("travel.friends")) {
    return {
      value: "friends",
      confidence: 0.88,
      reasonKo: "친구 동행 의도예요",
    };
  }
  if (ids.has("travel.solo")) {
    return {
      value: "solo",
      confidence: 0.9,
      reasonKo: "혼자 여행 의도예요",
    };
  }
  if (ids.has("travel.business") || (p.business ?? 0) >= 0.85) {
    return {
      value: "solo",
      confidence: 0.86,
      reasonKo: "출장 맥락이라 개인 일정으로 봤어요",
    };
  }
  return null;
}

function resolveLodging(
  ids: Set<string>,
  p: SemanticProfile,
  blendIndieRomantic: boolean,
): TravelIntentProjection["lodgingPriority"] {
  if (ids.has("travel.business") || (p.business ?? 0) >= 0.85) {
    return {
      value: "station",
      confidence: 0.9,
      reasonKo: "출장이라 이동·역세권을 먼저 봐요",
    };
  }
  if (ids.has("travel.family_parents") || ids.has("travel.family") || (p.family ?? 0) >= 0.85) {
    return {
      value: "family",
      confidence: 0.9,
      reasonKo: "가족 편의 숙소를 우선해요",
    };
  }
  if (blendIndieRomantic) {
    return {
      value: "aesthetic",
      confidence: 0.91,
      reasonKo: "신혼·인디 감성이라 분위기 있는 작은 숙소를 먼저 봐요",
    };
  }
  if ((p.quiet ?? 0) >= 0.8 && (p.romantic ?? 0) < 0.7) {
    return {
      value: "quiet",
      confidence: 0.86,
      reasonKo: "조용한 숙소 신호가 강해요",
    };
  }
  if ((p.romantic ?? 0) >= 0.8 || (p.photo ?? 0) >= 0.75 || (p.luxury ?? 0) >= 0.8) {
    return {
      value: "aesthetic",
      confidence: 0.88,
      reasonKo: "분위기·뷰 숙소 의도예요",
    };
  }
  if (ids.has("travel.friends") || p.budget === "value") {
    return {
      value: "price",
      confidence: 0.82,
      reasonKo: "가성비 숙소 쪽을 먼저 봐요",
    };
  }
  return null;
}

function resolveFood(
  ids: Set<string>,
  p: SemanticProfile,
  blendIndieRomantic: boolean,
): TravelIntentProjection["foodBias"] {
  if (blendIndieRomantic || ((p.cafe ?? 0) >= 0.8 && (p.local ?? 0) >= 0.7)) {
    return {
      value: "cafe",
      confidence: 0.9,
      reasonKo: "인디·카페 감성으로 식·카페 축을 잡았어요",
    };
  }
  if ((p.cafe ?? 0) >= 0.85) {
    return {
      value: "cafe",
      confidence: 0.88,
      reasonKo: "카페 비중이 높은 의도예요",
    };
  }
  if ((p.local ?? 0) >= 0.8 || ids.has("mood.indie")) {
    return {
      value: "local",
      confidence: 0.86,
      reasonKo: "골목·로컬 맛 쪽으로 봐요",
    };
  }
  if ((p.romantic ?? 0) >= 0.85) {
    return {
      value: "landmark",
      confidence: 0.8,
      reasonKo: "둘만의 식사로 검증된 분위기 좋은 곳을 먼저 봐요",
    };
  }
  if (ids.has("travel.friends") || p.budget === "value") {
    return {
      value: "local",
      confidence: 0.78,
      reasonKo: "나눠 먹기 좋은 현지 쪽을 열어 둬요",
    };
  }
  if (ids.has("travel.family") || ids.has("travel.family_parents")) {
    return {
      value: "landmark",
      confidence: 0.8,
      reasonKo: "가족이라 실패 낮은 곳부터 봐요",
    };
  }
  return null;
}

function resolveTripStyle(p: SemanticProfile): TravelIntentProjection["tripStyle"] {
  if ((p.pace_relaxed ?? 0) >= 0.7 && (p.pace_packed ?? 0) < 0.55) {
    return {
      value: "relaxed",
      confidence: 0.86,
      reasonKo: "느긋한 리듬 의도예요",
    };
  }
  if ((p.pace_packed ?? 0) >= 0.7) {
    return {
      value: "packed",
      confidence: 0.84,
      reasonKo: "밀도 높은 일정 쪽이에요",
    };
  }
  return null;
}

function resolveBudget(p: SemanticProfile): TravelIntentProjection["budgetBand"] {
  if (p.budget === "premium" || (p.luxury ?? 0) >= 0.85) {
    return {
      value: "premium",
      confidence: 0.88,
      reasonKo: "프리미엄 예산 신호예요",
    };
  }
  if (p.budget === "value") {
    return {
      value: "value",
      confidence: 0.86,
      reasonKo: "가성비 예산 신호예요",
    };
  }
  if (p.budget === "medium_high") {
    return {
      value: "balanced",
      confidence: 0.8,
      reasonKo: "중상 예산으로 분위기·품질 여유를 둡니다",
    };
  }
  if (p.budget === "medium") {
    return {
      value: "balanced",
      confidence: 0.72,
      reasonKo: "중간 예산 밴드예요",
    };
  }
  return null;
}

function resolveContent(
  p: SemanticProfile,
  blendIndieRomantic: boolean,
): TravelIntentProjection["contentIntent"] {
  if (blendIndieRomantic || (p.photo ?? 0) >= 0.75) {
    return {
      value: "photo",
      confidence: 0.86,
      reasonKo: "사진·분위기 기록이 중요한 여행으로 봤어요",
    };
  }
  if ((p.cafe ?? 0) >= 0.85 || (p.local ?? 0) >= 0.85) {
    return {
      value: "food",
      confidence: 0.8,
      reasonKo: "카페·로컬 먹거리가 중심이에요",
    };
  }
  return null;
}

function resolveShopping(
  p: SemanticProfile,
  ids: Set<string>,
): TravelIntentProjection["shoppingIntent"] {
  if (ids.has("mood.indie") && (p.shopping ?? 0) >= 0.5) {
    return {
      value: "mixed",
      confidence: 0.78,
      reasonKo: "편집숍·소품 정도를 열어 둡니다",
    };
  }
  if ((p.shopping ?? 0) >= 0.7) {
    return {
      value: "shopping",
      confidence: 0.82,
      reasonKo: "쇼핑 비중이 있어요",
    };
  }
  if ((p.shopping ?? 0) > 0 && (p.shopping ?? 0) < 0.45) {
    return {
      value: "low",
      confidence: 0.7,
      reasonKo: "쇼핑은 가볍게만 둡니다",
    };
  }
  return null;
}
