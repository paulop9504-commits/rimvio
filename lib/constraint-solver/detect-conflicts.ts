/**
 * Detect pairwise conflicts between hard constraints.
 */

import type { Constraint, ConstraintConflict } from "@/lib/constraint-solver/types";

type ConflictRule = {
  readonly kindA: string;
  readonly kindB: string;
  readonly detect: (a: Constraint, b: Constraint) => string | null;
};

const CONFLICT_RULES: readonly ConflictRule[] = [
  {
    kindA: "budget",
    kindB: "preference",
    detect: (a, b) => {
      const budgetMatch = a.expression.match(/(\d+)/);
      if (!budgetMatch) return null;
      const budget = Number(budgetMatch[1]);
      if (
        budget < 100 &&
        /럭셔리|스위트|리조트|풀빌라/iu.test(b.expression)
      ) {
        return "저예산과 럭셔리 숙소는 양립이 어렵습니다";
      }
      return null;
    },
  },
  {
    kindA: "time",
    kindB: "location",
    detect: (a, b) => {
      const dayMatch = a.expression.match(/(\d+)\s*박/);
      const locationCount = (b.expression.match(/,/g) || []).length + 1;
      if (dayMatch && locationCount > Number(dayMatch[1]) + 1) {
        return `${dayMatch[1]}박 일정에 ${locationCount}개 지역은 촉박합니다`;
      }
      return null;
    },
  },
  {
    kindA: "weather",
    kindB: "time",
    detect: (_a, _b) => {
      // Placeholder — requires weather API data to validate
      return null;
    },
  },
];

export function detectConflicts(
  constraints: readonly Constraint[],
): readonly ConstraintConflict[] {
  const conflicts: ConstraintConflict[] = [];
  const hard = constraints.filter((c) => c.priority === "hard");

  for (let i = 0; i < hard.length; i++) {
    for (let j = i + 1; j < hard.length; j++) {
      const a = hard[i]!;
      const b = hard[j]!;
      for (const rule of CONFLICT_RULES) {
        const match =
          (a.kind === rule.kindA && b.kind === rule.kindB)
            ? rule.detect(a, b)
            : (a.kind === rule.kindB && b.kind === rule.kindA)
              ? rule.detect(b, a)
              : null;
        if (match) {
          conflicts.push({
            constraintIds: [a.id, b.id],
            reason: match,
            resolutionHintKo: match,
          });
        }
      }
    }
  }

  return conflicts;
}
