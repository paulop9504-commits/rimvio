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

export function evaluateScoutQualityGate(
  input: ScoutQualityGateInput,
): ScoutQualityGateResult {
  const maxAttempts = input.maxAttempts ?? DEFAULT_SCOUT_QUALITY_MAX_ATTEMPTS;
  const count = Math.max(0, input.recommendationCount);
  const minExpected = SCOUT_QUALITY_MIN_RECOMMENDATIONS;

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
