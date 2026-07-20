/**
 * Apply ContextFieldPack → GraphFilterPredicate.
 */

import type { GraphFilterPredicate } from "@/lib/graph-command/types";
import type { ContextFieldPack } from "@/lib/context-field/types";

/** Build graph filter knobs from a field pack (null when nothing applies). */
export function applyFieldsToGraphFilter(
  pack: ContextFieldPack,
): GraphFilterPredicate | null {
  const predicate: {
    maxWalkMinutes?: number | null;
    localFavoriteOnly?: boolean | null;
    sortBy?: GraphFilterPredicate["sortBy"];
  } = {};
  let matched = false;

  if (pack.distance?.maxWalkMinutes != null) {
    predicate.maxWalkMinutes = pack.distance.maxWalkMinutes;
    matched = true;
  }

  if (pack.popularity?.localFavoriteOnly) {
    predicate.localFavoriteOnly = true;
    predicate.sortBy = "local_desc";
    matched = true;
  }

  if (!matched) {
    return null;
  }

  return predicate;
}

/** Merge field-derived predicate into an existing filter predicate. */
export function mergeGraphFilterPredicates(
  base: GraphFilterPredicate,
  fromFields: GraphFilterPredicate | null,
): GraphFilterPredicate {
  if (!fromFields) {
    return base;
  }
  return {
    ...base,
    ...(fromFields.maxWalkMinutes !== undefined
      ? { maxWalkMinutes: fromFields.maxWalkMinutes }
      : {}),
    ...(fromFields.localFavoriteOnly !== undefined
      ? { localFavoriteOnly: fromFields.localFavoriteOnly }
      : {}),
    ...(fromFields.sortBy !== undefined ? { sortBy: fromFields.sortBy } : {}),
    ...(fromFields.minRating !== undefined
      ? { minRating: fromFields.minRating }
      : {}),
    ...(fromFields.reservableOnly !== undefined
      ? { reservableOnly: fromFields.reservableOnly }
      : {}),
    ...(fromFields.domain !== undefined ? { domain: fromFields.domain } : {}),
  };
}
