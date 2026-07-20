/**
 * Post-scout quality gate — Cursor-like insufficient → replan, never silent Commit.
 * @see docs/RIMVIO_TEAM_COLLABORATION.md
 */

export type ScoutQualityVerdict = "sufficient" | "insufficient" | "exhausted";

export type ScoutQualityGateInput = {
  readonly recommendationCount: number;
  readonly lodgingCount?: number;
  readonly eateryCount?: number;
  readonly activityCount?: number;
  readonly amenityCount?: number;
  /** Attempts already spent for this engine (0 = first scout). */
  readonly attemptsUsed: number;
  readonly maxAttempts?: number;
};

export type ScoutQualityGateResult = {
  readonly verdict: ScoutQualityVerdict;
  readonly reason: string;
  readonly minExpected: number;
};

export const DEFAULT_SCOUT_QUALITY_MAX_ATTEMPTS = 2;

/** Soft floor — thin lists feel "not enough" even if > 0. */
export const SCOUT_QUALITY_MIN_RECOMMENDATIONS = 3;

/** Lodging-only scout (capsule near station) — 2 hits is enough to decide. */
export const SCOUT_QUALITY_MIN_LODGING_ONLY = 2;

function resolveMinExpected(input: ScoutQualityGateInput): number {
  const lodging = Math.max(0, input.lodgingCount ?? 0);
  const eatery = Math.max(0, input.eateryCount ?? 0);
  const activity = Math.max(0, input.activityCount ?? 0);
  const amenity = Math.max(0, input.amenityCount ?? 0);
  const others = eatery + activity + amenity;
  const count = Math.max(0, input.recommendationCount);
  if (lodging >= SCOUT_QUALITY_MIN_LODGING_ONLY && others === 0 && count === lodging) {
    return SCOUT_QUALITY_MIN_LODGING_ONLY;
  }
  return SCOUT_QUALITY_MIN_RECOMMENDATIONS;
}

export function evaluateScoutQualityGate(
  input: ScoutQualityGateInput,
): ScoutQualityGateResult {
  const maxAttempts = input.maxAttempts ?? DEFAULT_SCOUT_QUALITY_MAX_ATTEMPTS;
  const count = Math.max(0, input.recommendationCount);
  const minExpected = resolveMinExpected(input);

  if (count === 0) {
    if (input.attemptsUsed >= maxAttempts) {
      return {
        verdict: "exhausted",
        reason: "empty_after_budget",
        minExpected,
      };
    }
    return {
      verdict: "insufficient",
      reason: "empty",
      minExpected,
    };
  }

  if (count < minExpected) {
    if (input.attemptsUsed >= maxAttempts) {
      return {
        verdict: "exhausted",
        reason: "thin_after_budget",
        minExpected,
      };
    }
    return {
      verdict: "insufficient",
      reason: "thin",
      minExpected,
    };
  }

  return {
    verdict: "sufficient",
    reason: "ok",
    minExpected,
  };
}
