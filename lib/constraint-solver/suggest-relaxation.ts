/**
 * Suggest relaxation of soft constraints when hard constraints conflict.
 */

import type { Constraint, ConstraintConflict } from "@/lib/constraint-solver/types";

export function suggestRelaxation(
  constraints: readonly Constraint[],
  conflicts: readonly ConstraintConflict[],
): readonly string[] {
  if (conflicts.length === 0) return [];

  const suggestions: string[] = [];
  const involvedIds = new Set(conflicts.flatMap((c) => c.constraintIds));

  for (const c of constraints) {
    if (!involvedIds.has(c.id)) continue;

    if (c.priority === "soft") {
      suggestions.push(`"${c.expression}" 조건을 완화하면 해결될 수 있습니다`);
      continue;
    }

    if (c.kind === "budget") {
      const match = c.expression.match(/(\d+)/);
      if (match) {
        const amount = Number(match[1]);
        const bump = Math.ceil(amount * 0.15);
        suggestions.push(
          `예산을 ${bump}만원 증가하면 해결될 수 있습니다`,
        );
      }
    }

    if (c.kind === "time") {
      suggestions.push("일정을 1-2일 늘리면 해결될 수 있습니다");
    }
  }

  return suggestions;
}
