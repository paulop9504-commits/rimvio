import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";
import type { WeightedAlignmentScore } from "@/lib/globe/market/score-weighted-market-alignment";
import type { OpportunityFieldCopy } from "@/lib/globe/opportunity-field/types";

const FIELD_LABELS: Partial<Record<MarketPrioritySlotId, keyof OpportunityFieldCopy>> = {
  storage_gb: "reasonStorage",
  battery_health: "reasonBattery",
  price: "reasonPrice",
  distance: "reasonDistance",
  cosmetic_grade: "reasonCondition",
  condition_abc: "reasonCondition",
};

function isRecentListing(confirmedAtIso: string, now: Date): boolean {
  const ms = Date.parse(confirmedAtIso);
  if (Number.isNaN(ms)) {
    return false;
  }
  const ageDays = (now.getTime() - ms) / 86_400_000;
  return ageDays <= 5;
}

export function explainOpportunityReasonKo(input: {
  weighted: WeightedAlignmentScore;
  distanceKm: number | null;
  confirmedAtIso: string;
  now: Date;
  copy: OpportunityFieldCopy;
}): { reasonKo: string; matchReasons: string[] } {
  const sorted = [...input.weighted.breakdown].sort(
    (a, b) => b.weight * b.match - a.weight * a.match,
  );
  const matchReasons: string[] = [];

  for (const row of sorted) {
    if (row.match < 0.68) {
      continue;
    }
    const key = FIELD_LABELS[row.field];
    if (key) {
      matchReasons.push(input.copy[key]);
    }
  }

  if (
    input.distanceKm != null &&
    input.distanceKm <= 3 &&
    !matchReasons.includes(input.copy.reasonDistance)
  ) {
    matchReasons.unshift(input.copy.reasonDistance);
  }

  if (isRecentListing(input.confirmedAtIso, input.now) && matchReasons.length < 3) {
    matchReasons.push(input.copy.reasonRecency);
  }

  const reasonKo = matchReasons[0] ?? input.copy.reasonFallback;
  return {
    reasonKo,
    matchReasons: matchReasons.slice(0, 3),
  };
}
