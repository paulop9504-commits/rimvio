import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import type { ScoredLodgingRecommendation } from "@/lib/globe/lodging/score-lodging-recommendations";
import type { ScoredEateryRecommendation } from "@/lib/globe/eatery/score-eatery-recommendations";
import { LOCAL_DISCOVERY_PIN_CAP } from "@/lib/globe/context-condition-ai/local-discovery-limits";

type RankedPin = {
  kind: "lodging" | "eatery";
  score: number;
  lodging?: ScoredLodgingRecommendation;
  eatery?: ScoredEateryRecommendation;
};

/** Interleave lodging + eatery by score — cap total map pins. */
export function pickTopLocalDiscoveryRows(input: {
  lodgingScored: readonly ScoredLodgingRecommendation[];
  eateryScored: readonly ScoredEateryRecommendation[];
  cap?: number;
}): {
  lodgingScored: ScoredLodgingRecommendation[];
  eateryScored: ScoredEateryRecommendation[];
  lodgingRows: ContextLodgingInventoryRow[];
  eateryRows: ContextEateryInventoryRow[];
} {
  const cap = input.cap ?? LOCAL_DISCOVERY_PIN_CAP;
  const ranked: RankedPin[] = [
    ...input.lodgingScored.map((row) => ({
      kind: "lodging" as const,
      score: row.score,
      lodging: row,
    })),
    ...input.eateryScored.map((row) => ({
      kind: "eatery" as const,
      score: row.score,
      eatery: row,
    })),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, cap);

  const lodgingScored: ScoredLodgingRecommendation[] = [];
  const eateryScored: ScoredEateryRecommendation[] = [];
  for (const row of ranked) {
    if (row.kind === "lodging" && row.lodging) {
      lodgingScored.push(row.lodging);
    }
    if (row.kind === "eatery" && row.eatery) {
      eateryScored.push(row.eatery);
    }
  }

  return {
    lodgingScored,
    eateryScored,
    lodgingRows: lodgingScored.map((row) => row.row),
    eateryRows: eateryScored.map((row) => row.row),
  };
}
