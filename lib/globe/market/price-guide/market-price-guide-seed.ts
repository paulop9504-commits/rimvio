import type { MarketBatteryTierId } from "@/lib/globe/market/price-guide/market-battery-tier";

export type MarketPriceBandSeed = {
  minMan: number;
  maxMan: number;
  anchorMan: number;
};

export type MarketProductSeedKey =
  | "iphone_15_pro"
  | "iphone_15"
  | "iphone_generic";

const PHONE_BANDS: Record<
  MarketProductSeedKey,
  Record<MarketBatteryTierId, MarketPriceBandSeed>
> = {
  iphone_15_pro: {
    A: { minMan: 100, maxMan: 110, anchorMan: 105 },
    B: { minMan: 85, maxMan: 95, anchorMan: 90 },
    C: { minMan: 70, maxMan: 80, anchorMan: 75 },
  },
  iphone_15: {
    A: { minMan: 90, maxMan: 100, anchorMan: 95 },
    B: { minMan: 75, maxMan: 85, anchorMan: 80 },
    C: { minMan: 60, maxMan: 70, anchorMan: 65 },
  },
  iphone_generic: {
    A: { minMan: 55, maxMan: 70, anchorMan: 62 },
    B: { minMan: 40, maxMan: 55, anchorMan: 47 },
    C: { minMan: 28, maxMan: 40, anchorMan: 34 },
  },
};

const COSMETIC_WEIGHT: Record<string, number> = {
  like_new: 1.04,
  good: 1,
  fair: 0.93,
  for_parts: 0.85,
};

export function normalizeMarketProductSeedKey(productName: string): MarketProductSeedKey | null {
  const q = productName.toLowerCase().replace(/\s+/gu, " ");
  if (/iphone\s*15\s*pro|아이폰\s*15\s*프로/u.test(q)) {
    return "iphone_15_pro";
  }
  if (/iphone\s*15(?!\s*pro)|아이폰\s*15(?!\s*프로)/u.test(q)) {
    return "iphone_15";
  }
  if (/iphone|아이폰/u.test(q)) {
    return "iphone_generic";
  }
  return null;
}

export function readMarketCosmeticWeight(cosmeticGrade: string | null | undefined): number {
  if (!cosmeticGrade) {
    return 1;
  }
  return COSMETIC_WEIGHT[cosmeticGrade] ?? 1;
}

function scaleMan(value: number, weight: number): number {
  return Math.max(5, Math.round(value * weight));
}

export function readMarketPriceBandSeed(input: {
  productKey: MarketProductSeedKey;
  batteryTierId: MarketBatteryTierId;
  cosmeticWeight?: number;
}): MarketPriceBandSeed {
  const raw = PHONE_BANDS[input.productKey][input.batteryTierId];
  const weight = input.cosmeticWeight ?? 1;
  return {
    minMan: scaleMan(raw.minMan, weight),
    maxMan: scaleMan(raw.maxMan, weight),
    anchorMan: scaleMan(raw.anchorMan, weight),
  };
}
