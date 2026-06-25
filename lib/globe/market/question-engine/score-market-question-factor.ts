import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";
import type { MarketQuestionFactorDef } from "@/lib/globe/market/question-engine/types";

const TEXT_BOOSTS: ReadonlyArray<{
  pattern: RegExp;
  slots: readonly MarketPrioritySlotId[];
  boost: number;
}> = [
  {
    pattern: /배터리|battery/iu,
    slots: ["battery_health"],
    boost: 0.12,
  },
  {
    pattern: /\d{2,4}\s*(?:gb|기가)|용량|storage/iu,
    slots: ["storage_gb"],
    boost: 0.14,
  },
  {
    pattern: /외관|기스|스크래치|긁힘|scratch|생활기스/iu,
    slots: ["cosmetic_grade", "condition_abc"],
    boost: 0.1,
  },
  {
    pattern: /수리|as\b|사고|교환|수리이력|무사고/iu,
    slots: ["repair_history"],
    boost: 0.14,
  },
  {
    pattern: /주행|km|키로|만\s*km/iu,
    slots: ["model_year"],
    boost: 0.15,
  },
  {
    pattern: /연식|년식|20\d{2}/iu,
    slots: ["model_year"],
    boost: 0.1,
  },
  {
    pattern: /셔터|컷수|작동|고장/iu,
    slots: ["working_state"],
    boost: 0.12,
  },
  {
    pattern: /가격|만원|예산|budget|\d+\s*만/iu,
    slots: ["price"],
    boost: 0.08,
  },
  {
    pattern: /색상|색깔|블랙|화이트|color/iu,
    slots: ["color_design"],
    boost: 0.06,
  },
  {
    pattern: /근처|직거래|거리|km\b/iu,
    slots: ["distance"],
    boost: 0.05,
  },
];

const LOW_PRIORITY_SLOTS = new Set<MarketPrioritySlotId>([
  "color_design",
  "distance",
]);

export function scoreMarketQuestionFactor(input: {
  factor: MarketQuestionFactorDef;
  corpus: string;
  frequentSlots?: readonly MarketPrioritySlotId[];
  skipSlots?: readonly MarketPrioritySlotId[];
  /** Learned per-user slot importance (0–1). */
  slotImportance?: number;
}): number {
  let score = input.factor.baseWeight;

  for (const rule of TEXT_BOOSTS) {
    if (!rule.pattern.test(input.corpus)) {
      continue;
    }
    if (rule.slots.includes(input.factor.slotId)) {
      score += rule.boost;
    }
  }

  if (input.frequentSlots?.includes(input.factor.slotId)) {
    score += 0.06;
  }
  if (input.skipSlots?.includes(input.factor.slotId)) {
    score -= 0.25;
  }

  if (typeof input.slotImportance === "number") {
    score = score * 0.55 + input.slotImportance * 0.45;
  }

  if (LOW_PRIORITY_SLOTS.has(input.factor.slotId)) {
    score *= 0.55;
  }

  return Math.max(0, Math.min(1, score));
}
