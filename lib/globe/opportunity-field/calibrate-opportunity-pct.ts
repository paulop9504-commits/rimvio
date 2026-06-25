const MIN_NUDGE_SCORE = 0.72;

/** Map raw field score to display % — aligned with market nudge threshold. */
export function calibrateOpportunityPct(fieldScore: number): number {
  const s = Math.max(0, Math.min(1, fieldScore));
  if (s < 0.35) {
    return Math.round(15 + s * 55);
  }
  if (s < MIN_NUDGE_SCORE) {
    return Math.round(35 + ((s - 0.35) / (MIN_NUDGE_SCORE - 0.35)) * 35);
  }
  return Math.round(70 + ((s - MIN_NUDGE_SCORE) / (1 - MIN_NUDGE_SCORE)) * 25);
}
