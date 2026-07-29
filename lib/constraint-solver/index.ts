export type {
  Constraint,
  ConstraintKind,
  ConstraintConflict,
  ConstraintResource,
  ConstraintSolveResult,
} from "@/lib/constraint-solver/types";
export { solveConstraints } from "@/lib/constraint-solver/solve-constraints";
export { detectConflicts } from "@/lib/constraint-solver/detect-conflicts";
export { suggestRelaxation } from "@/lib/constraint-solver/suggest-relaxation";
