/**
 * Contributor reward formula v2 (ADR-066).
 * payout = base × quality × uniqueness × difficulty × verification × usage
 */

export type RewardFactorsV2 = {
  readonly quality: number;
  readonly uniqueness: number;
  readonly difficulty: number;
  readonly verification: number;
  readonly usage: number;
};

export type ContributorRewardV2Input = {
  readonly baseRewardKrw: number;
  readonly qualityMultiplier?: number;
  readonly difficulty?: number;
  readonly verificationConfidence?: number | null;
  readonly uniquenessScore?: number | null;
  readonly usageWeight?: number | null;
};

export type ContributorRewardV2Result = {
  readonly amountKrw: number;
  readonly factors: RewardFactorsV2;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function difficultyFactor(tier: number): number {
  const t = clamp(Math.round(tier), 1, 5);
  return 1 + (t - 1) * 0.1;
}

export function computeContributorRewardV2(
  input: ContributorRewardV2Input,
): ContributorRewardV2Result {
  const quality = clamp(input.qualityMultiplier ?? 1, 0.5, 1.5);
  const uniqueness = clamp(0.8 + (input.uniquenessScore ?? 0.5) * 0.4, 0.8, 1.2);
  const difficulty = difficultyFactor(input.difficulty ?? 2);
  const verification = clamp(
    input.verificationConfidence != null ? 0.7 + input.verificationConfidence * 0.3 : 1,
    0.7,
    1,
  );
  const usage = clamp(input.usageWeight != null ? 0.85 + input.usageWeight * 0.15 : 1, 0.85, 1.15);

  const factors: RewardFactorsV2 = {
    quality,
    uniqueness,
    difficulty,
    verification,
    usage,
  };

  const raw =
    input.baseRewardKrw * quality * uniqueness * difficulty * verification * usage;

  return {
    amountKrw: Math.max(0, Math.round(raw)),
    factors,
  };
}
