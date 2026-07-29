/**
 * Constraint Solver — cross-validate all constraints and return feasibility.
 */

import type {
  Constraint,
  ConstraintResource,
  ConstraintSolveResult,
} from "@/lib/constraint-solver/types";
import { detectConflicts } from "@/lib/constraint-solver/detect-conflicts";
import { suggestRelaxation } from "@/lib/constraint-solver/suggest-relaxation";

export function solveConstraints(
  constraints: readonly Constraint[],
  resources: readonly ConstraintResource[] = [],
): ConstraintSolveResult {
  if (constraints.length === 0) {
    return {
      feasible: true,
      conflicts: [],
      satisfiedIds: [],
      violatedIds: [],
      suggestionsKo: [],
    };
  }

  const conflicts = detectConflicts(constraints);
  const conflictIds = new Set(conflicts.flatMap((c) => c.constraintIds));

  const satisfiedIds: string[] = [];
  const violatedIds: string[] = [];

  for (const c of constraints) {
    if (conflictIds.has(c.id)) {
      violatedIds.push(c.id);
      continue;
    }

    const resourceMatch = resources.some((r) => r.satisfies.includes(c.id));
    if (resourceMatch || c.priority === "soft") {
      satisfiedIds.push(c.id);
    } else if (resources.length > 0) {
      violatedIds.push(c.id);
    } else {
      satisfiedIds.push(c.id);
    }
  }

  const hardViolated = constraints.filter(
    (c) => c.priority === "hard" && violatedIds.includes(c.id),
  );
  const feasible = hardViolated.length === 0;

  const suggestionsKo = feasible
    ? []
    : suggestRelaxation(constraints, conflicts);

  return {
    feasible,
    conflicts,
    satisfiedIds,
    violatedIds,
    suggestionsKo,
  };
}
