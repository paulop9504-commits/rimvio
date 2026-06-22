/**
 * Market v1.2 — weighted slot matching (deterministic).
 */

import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import {
  getCategoryPriorityMatrix,
  getWeightedPrioritySlots,
  type MarketPrioritySlotId,
} from "@/lib/globe/market/market-priority-matrix";
import { haversineKm } from "@/lib/globe/trend-bridge/server/trend-bridge-geo";

export type MarketPrioritySlotValues = Partial<
  Record<MarketPrioritySlotId, string | number | boolean | null>
>;

function readSlotValues(record: MarketIntentRecord): MarketPrioritySlotValues {
  return record.detail.prioritySlots ?? {};
}

function priceOverlapScore(a: MarketIntentRecord, b: MarketIntentRecord): number {
  const aMin = a.priceMinKrw ?? 0;
  const aMax = a.priceMaxKrw ?? Number.MAX_SAFE_INTEGER;
  const bMin = b.priceMinKrw ?? 0;
  const bMax = b.priceMaxKrw ?? Number.MAX_SAFE_INTEGER;
  if (aMax < bMin || bMax < aMin) {
    return 0;
  }
  const overlapMin = Math.max(aMin, bMin);
  const overlapMax = Math.min(aMax, bMax);
  const overlap = Math.max(0, overlapMax - overlapMin);
  const span = Math.max(aMax, bMax) - Math.min(aMin || overlapMin, bMin || overlapMin);
  if (span <= 0) {
    return 1;
  }
  if (a.detail.priceNegotiable || b.detail.priceNegotiable) {
    return Math.max(0.55, overlap / span);
  }
  return Math.min(1, overlap / span);
}

function gradeScore(
  seeking: string | null | undefined,
  listing: string | null | undefined,
): number {
  const order = ["A", "B", "C", "D"];
  const normalize = (raw: string) => {
    const upper = raw.trim().toUpperCase();
    if (order.includes(upper)) {
      return upper;
    }
    if (/새|like|mint/iu.test(raw)) {
      return "A";
    }
    if (/적음|good|양호/iu.test(raw)) {
      return "B";
    }
    if (/있음|fair|보통/iu.test(raw)) {
      return "C";
    }
    return upper.slice(0, 1);
  };
  const s = seeking ? normalize(String(seeking)) : null;
  const l = listing ? normalize(String(listing)) : null;
  if (!s || !l) {
    return 0.65;
  }
  const si = order.indexOf(s);
  const li = order.indexOf(l);
  if (si < 0 || li < 0) {
    return s === l ? 1 : 0.5;
  }
  if (li <= si) {
    return 1;
  }
  return Math.max(0, 1 - (li - si) * 0.35);
}

function batteryScore(seeking: MarketIntentRecord, listing: MarketIntentRecord): number {
  const seekVal = readSlotValues(seeking).battery_health;
  const listVal = readSlotValues(listing).battery_health;
  const seekMin =
    typeof seekVal === "number"
      ? seekVal
      : typeof seekVal === "string"
        ? Number.parseInt(seekVal, 10)
        : null;
  const listPct =
    typeof listVal === "number"
      ? listVal
      : typeof listVal === "string"
        ? Number.parseInt(listVal, 10)
        : null;
  if (!Number.isFinite(seekMin ?? NaN) || !Number.isFinite(listPct ?? NaN)) {
    return 0.6;
  }
  if ((listPct as number) >= (seekMin as number)) {
    return 1;
  }
  const gap = (seekMin as number) - (listPct as number);
  return Math.max(0, 1 - gap / 40);
}

function repairHistoryScore(seeking: MarketIntentRecord, listing: MarketIntentRecord): number {
  const seek = readSlotValues(seeking).repair_history;
  const list = readSlotValues(listing).repair_history;
  if (seek === true || seek === "true") {
    return list === false || list === "false" ? 1 : list === true || list === "true" ? 0 : 0.55;
  }
  return list === false || list === "false" || list === undefined ? 0.85 : 0.35;
}

function textOverlapScore(
  seeking: string | null | undefined,
  listing: string | null | undefined,
): number {
  const s = seeking?.trim().toLowerCase();
  const l = listing?.trim().toLowerCase();
  if (!s || !l) {
    return 0.6;
  }
  if (s === l || l.includes(s) || s.includes(l)) {
    return 1;
  }
  const sTokens = s.split(/\s+/u).filter(Boolean);
  const hits = sTokens.filter((token) => l.includes(token)).length;
  return hits > 0 ? Math.min(1, hits / Math.max(1, sTokens.length)) : 0.35;
}

function distanceScore(a: MarketIntentRecord, b: MarketIntentRecord): number {
  const distanceKm = haversineKm(a.anchorLat, a.anchorLng, b.anchorLat, b.anchorLng);
  const allowed = Math.min(a.radiusKm, b.radiusKm);
  if (distanceKm > allowed) {
    return 0;
  }
  return Math.max(0, 1 - distanceKm / Math.max(allowed, 0.5));
}

function slotMatchScore(
  field: MarketPrioritySlotId,
  self: MarketIntentRecord,
  other: MarketIntentRecord,
): number {
  const seeking = self.role === "seeking" ? self : other;
  const listing = self.role === "listing" ? self : other;
  const seekSlots = readSlotValues(seeking);
  const listSlots = readSlotValues(listing);

  switch (field) {
    case "price":
      return priceOverlapScore(seeking, listing);
    case "battery_health":
      return batteryScore(seeking, listing);
    case "cosmetic_grade":
      return gradeScore(
        String(seekSlots.cosmetic_grade ?? ""),
        String(listSlots.cosmetic_grade ?? listing.detail.conditionId ?? ""),
      );
    case "condition_abc":
      return gradeScore(
        String(seekSlots.condition_abc ?? ""),
        String(listSlots.condition_abc ?? listing.detail.conditionId ?? ""),
      );
    case "repair_history":
      return repairHistoryScore(seeking, listing);
    case "color_design":
      return textOverlapScore(
        String(seekSlots.color_design ?? ""),
        String(listSlots.color_design ?? ""),
      );
    case "model_year":
      return textOverlapScore(
        String(seekSlots.model_year ?? ""),
        String(listSlots.model_year ?? listing.title),
      );
    case "size_type":
      return textOverlapScore(
        String(seekSlots.size_type ?? ""),
        String(listSlots.size_type ?? ""),
      );
    case "working_state":
      return textOverlapScore(
        String(seekSlots.working_state ?? ""),
        String(listSlots.working_state ?? ""),
      );
    case "distance":
      return distanceScore(seeking, listing);
    default:
      return 0.5;
  }
}

const SLOT_LABEL_KO: Record<MarketPrioritySlotId, string> = {
  price: "가격",
  battery_health: "배터리",
  cosmetic_grade: "외관",
  repair_history: "수리 이력",
  color_design: "색상",
  condition_abc: "상태",
  model_year: "연식",
  distance: "거리",
  size_type: "크기",
  working_state: "작동",
};

export type WeightedAlignmentScore = {
  total: number;
  threshold: number;
  passes: boolean;
  breakdown: Array<{ field: MarketPrioritySlotId; weight: number; match: number }>;
  topMatchedLabelsKo: string[];
};

export function scoreWeightedMarketAlignment(
  self: MarketIntentRecord,
  other: MarketIntentRecord,
): WeightedAlignmentScore {
  const categoryId =
    self.categoryId === "market.general" ? other.categoryId : self.categoryId;
  const matrix = getCategoryPriorityMatrix(categoryId);
  const slots = getWeightedPrioritySlots(categoryId);

  let weightSum = 0;
  const breakdown: WeightedAlignmentScore["breakdown"] = [];

  for (const slot of slots) {
    const match = slotMatchScore(slot.field, self, other);
    breakdown.push({ field: slot.field, weight: slot.weight, match });
    weightSum += slot.weight;
  }

  const total =
    weightSum > 0
      ? breakdown.reduce((sum, row) => sum + row.weight * row.match, 0) / weightSum
      : 0;

  const sorted = [...breakdown].sort((a, b) => b.weight * b.match - a.weight * a.match);
  const topMatchedLabelsKo = sorted
    .filter((row) => row.match >= 0.7)
    .slice(0, 2)
    .map((row) => SLOT_LABEL_KO[row.field] ?? row.field);

  return {
    total,
    threshold: matrix.matchThreshold,
    passes: total >= matrix.matchThreshold,
    breakdown,
    topMatchedLabelsKo,
  };
}
