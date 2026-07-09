import type { ContextPlaceInventoryRow } from "@/lib/globe/place/place-resource-types";
import type { LocalDiscoveryActivitySubtype } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import {
  classifyPlaceCategory,
  type PlaceCategory,
} from "@/lib/globe/context-condition-ai/discovery-guard/classify-place-category";
import type { ExplorationPolicyKnobs } from "@/lib/globe/discovery-policy/apply-exploration-mode";
import { explorationScoreBias } from "@/lib/globe/discovery-policy/exploration-score-bias";

export type ScoredPlaceRecommendation = {
  row: ContextPlaceInventoryRow;
  score: number;
  reasonKo: string;
  matchReasons: string[];
};

type PlaceDomain = "activity" | "amenity";

type ActivitySubtype = Exclude<LocalDiscoveryActivitySubtype, "general"> | "general";

function scoreDistance(domain: PlaceDomain, distanceKm: number | null): number {
  if (distanceKm == null) {
    return 0;
  }
  if (domain === "amenity") {
    if (distanceKm <= 0.3) return 180;
    if (distanceKm <= 0.8) return 130;
    if (distanceKm <= 1.5) return 85;
    if (distanceKm <= 3) return 30;
    return -20;
  }
  if (distanceKm <= 1) return 40;
  if (distanceKm <= 3) return 55;
  if (distanceKm <= 8) return 45;
  if (distanceKm <= 20) return 30;
  return 10;
}

function scoreCategory(
  domain: PlaceDomain,
  category: PlaceCategory,
  activitySubtype: ActivitySubtype,
): number {
  if (domain === "amenity") {
    return category === "amenity" ? 140 : category === "unknown" ? 20 : -80;
  }
  if (activitySubtype === "shopping") {
    if (category === "shopping") return 150;
    if (category === "attraction" || category === "photo_spot") return 70;
    if (category === "unknown") return 20;
    return -80;
  }
  if (activitySubtype === "museum") {
    if (category === "museum") return 155;
    if (category === "attraction" || category === "photo_spot") return 75;
    if (category === "unknown") return 20;
    return -80;
  }
  if (activitySubtype === "park") {
    if (category === "park") return 155;
    if (category === "attraction" || category === "photo_spot") return 70;
    if (category === "unknown") return 20;
    return -80;
  }
  if (activitySubtype === "nightlife") {
    if (category === "nightlife") return 160;
    if (category === "attraction" || category === "shopping") return 60;
    if (category === "unknown") return 20;
    return -90;
  }
  if (activitySubtype === "photo_spot") {
    if (category === "photo_spot") return 160;
    if (category === "attraction" || category === "park") return 85;
    if (category === "museum") return 60;
    if (category === "unknown") return 20;
    return -85;
  }
  if (
    category === "theme_park" ||
    category === "museum" ||
    category === "park" ||
    category === "shopping" ||
    category === "nightlife" ||
    category === "photo_spot" ||
    category === "attraction"
  ) {
    return 110;
  }
  if (category === "unknown") {
    return 25;
  }
  return -60;
}

function focusTokens(text: string | null | undefined): string[] {
  return (text ?? "")
    .toLowerCase()
    .split(/[\s·,]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function focusMatchBonus(row: ContextPlaceInventoryRow, tokens: readonly string[]): number {
  if (tokens.length === 0) {
    return 0;
  }
  const blob = [row.name, row.address, row.categoryLabel, row.specialReasonKo]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return tokens.some((token) => blob.includes(token)) ? 220 : 0;
}

function activitySubtypeLabel(subtype: ActivitySubtype): string {
  switch (subtype) {
    case "shopping":
      return "쇼핑 장소";
    case "museum":
      return "박물관·미술관";
    case "park":
      return "공원·산책 장소";
    case "nightlife":
      return "야경·나이트라이프";
    case "photo_spot":
      return "포토 스팟";
    default:
      return "놀거리 장소";
  }
}

function buildReason(
  domain: PlaceDomain,
  row: ContextPlaceInventoryRow,
  distanceKm: number | null,
  activitySubtype: ActivitySubtype,
): string {
  if (row.specialReasonKo?.trim()) {
    return row.specialReasonKo.trim();
  }
  const distance =
    distanceKm != null ? `${distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`} 거리` : null;
  if (domain === "amenity") {
    return [row.categoryLabel?.trim() || "편의 장소", distance].filter(Boolean).join(" · ");
  }
  return [row.categoryLabel?.trim() || activitySubtypeLabel(activitySubtype), distance]
    .filter(Boolean)
    .join(" · ");
}

export function scorePlaceRecommendations(input: {
  domain: PlaceDomain;
  rows: readonly ContextPlaceInventoryRow[];
  lat?: number | null;
  lng?: number | null;
  focusMatch?: string | null;
  activitySubtype?: ActivitySubtype | null;
  exploration?: ExplorationPolicyKnobs;
}): ScoredPlaceRecommendation[] {
  const tokens = focusTokens(input.focusMatch);
  const activitySubtype = input.activitySubtype ?? "general";
  const scored = input.rows.map((row) => {
    const distanceKm =
      input.lat != null && input.lng != null
        ? haversineKm(input.lat, input.lng, row.lat, row.lng)
        : null;
    const category = classifyPlaceCategory(row);
    const categoryScore = scoreCategory(input.domain, category, activitySubtype);
    const distanceScore = scoreDistance(input.domain, distanceKm);
    const focusScore = focusMatchBonus(row, tokens);
    const ratingScore =
      typeof row.rating === "number" && Number.isFinite(row.rating) ? row.rating * 8 : 0;
    const openScore = row.openNow === true ? 12 : 0;
    let score = 60 + categoryScore + distanceScore + focusScore + ratingScore + openScore;
    if (input.exploration) {
      score += explorationScoreBias({
        knobs: input.exploration,
        rating: row.rating,
        labels: [row.name, row.categoryLabel, row.specialReasonKo, row.address],
      });
    }
    const matchReasons = [
      row.specialReasonKo?.trim() || null,
      focusScore > 0 ? "선택한 장소 의도와 직접 맞아요" : null,
      categoryScore > 80
        ? input.domain === "amenity"
          ? "편의 목적과 맞는 장소예요"
          : activitySubtype === "shopping"
            ? "쇼핑 의도와 맞는 장소예요"
            : activitySubtype === "museum"
              ? "박물관·미술관 의도와 맞는 장소예요"
              : activitySubtype === "park"
                ? "공원·산책 의도와 맞는 장소예요"
                : activitySubtype === "nightlife"
                  ? "야경·나이트라이프 의도와 맞는 장소예요"
                  : activitySubtype === "photo_spot"
                    ? "사진 명소 의도와 맞는 장소예요"
                    : "놀거리 의도와 맞는 장소예요"
        : null,
      distanceKm != null
        ? distanceKm <= 1
          ? "가까운 거리예요"
          : input.domain === "activity" && distanceKm <= 20
            ? "도시 이동 범위 안이에요"
            : null
        : null,
    ].filter((value): value is string => Boolean(value));

    return {
      row,
      score,
      reasonKo: buildReason(input.domain, row, distanceKm, activitySubtype),
      matchReasons: matchReasons.slice(0, 3),
    };
  });

  scored.sort((a, b) => {
    const delta = b.score - a.score;
    if (delta !== 0) {
      return delta;
    }
    return a.row.name.localeCompare(b.row.name, "ko");
  });

  return scored;
}
