/** Internal scout score distribution — not user-facing. */

export type ScoreDistributionTelemetry = {
  readonly count: number;
  readonly mean: number;
  readonly stdDev: number;
  readonly min: number;
  readonly max: number;
};

export function computeScoreDistribution(
  scores: readonly number[],
): ScoreDistributionTelemetry | null {
  const values = scores.filter((value) => Number.isFinite(value));
  if (values.length === 0) {
    return null;
  }
  const count = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / count;
  return {
    count,
    mean: round(mean),
    stdDev: round(Math.sqrt(variance)),
    min: round(Math.min(...values)),
    max: round(Math.max(...values)),
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
