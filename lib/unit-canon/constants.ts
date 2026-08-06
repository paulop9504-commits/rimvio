/**
 * Rimvio Unit Canon — measured values = value + unit + context + surface.
 * Canonical: docs/RIMVIO_UNIT_CANON.md · ADR-047
 */

export const UNIT_CANON_VERSION = "unit-canon.v1" as const;

/** Where a number is allowed to appear. */
export const UNIT_SURFACES = ["display", "prepare", "commit"] as const;
export type UnitSurface = (typeof UNIT_SURFACES)[number];

export const MONEY_BASES = ["nightly", "total"] as const;
export type MoneyBasis = (typeof MONEY_BASES)[number];

export const DEFAULT_CURRENCY = "KRW" as const;

/** Lodging cards / chips / Compare callouts. */
export const LODGING_DISPLAY_MONEY_BASIS: MoneyBasis = "nightly";

/** Prepare + Reality Commit payment amounts. */
export const LODGING_COMMIT_MONEY_BASIS: MoneyBasis = "total";

/** Walk UI: minutes from meters. */
export const WALK_METERS_PER_MINUTE = 80 as const;

/** Rating store when source is 5-star. */
export const RATING_SCALE_MAX = 5 as const;

/** Match / AI Match percent. */
export const MATCH_SCORE_MAX = 100 as const;

export type MeasuredMoney = {
  readonly amount: number;
  readonly currency: typeof DEFAULT_CURRENCY | string;
  readonly basis: MoneyBasis;
  readonly taxesIncluded?: boolean | null;
  readonly nights?: number | null;
};

export type MeasuredDistance = {
  readonly meters: number;
};

export function walkMinutesFromMeters(meters: number): number {
  if (!Number.isFinite(meters) || meters < 0) return 0;
  return Math.max(1, Math.round(meters / WALK_METERS_PER_MINUTE));
}

export function assertDecisionWeightsSumToOne(
  weights: Readonly<Record<string, number>>,
  epsilon = 0.02,
): boolean {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1) <= epsilon;
}
