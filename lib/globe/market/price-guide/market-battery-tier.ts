export type MarketBatteryTierId = "A" | "B" | "C";

export type MarketBatteryTier = {
  id: MarketBatteryTierId;
  labelKo: string;
  minPercent: number;
  maxPercent: number;
};

const TIERS: readonly MarketBatteryTier[] = [
  { id: "A", labelKo: "A", minPercent: 90, maxPercent: 100 },
  { id: "B", labelKo: "B", minPercent: 80, maxPercent: 89 },
  { id: "C", labelKo: "C", minPercent: 0, maxPercent: 79 },
];

export function resolveMarketBatteryTier(percent: number): MarketBatteryTier | null {
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    return null;
  }
  const rounded = Math.round(percent);
  if (rounded >= 90) {
    return TIERS[0];
  }
  if (rounded >= 80) {
    return TIERS[1];
  }
  return TIERS[2];
}
