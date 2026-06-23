import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";
import type { MarketCategoryId, MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import { resolveMarketBatteryTier } from "@/lib/globe/market/price-guide/market-battery-tier";
import {
  normalizeMarketProductSeedKey,
  readMarketCosmeticWeight,
  readMarketPriceBandSeed,
} from "@/lib/globe/market/price-guide/market-price-guide-seed";

export type MarketVolumeZoneConfidence = "seed" | "realized";

export type MarketVolumeZoneRollupInput = {
  sampleCount: number;
  bandMinMan: number;
  bandMaxMan: number;
  anchorMan: number;
};

export type MarketVolumeZonePricePosition = "below" | "in_zone" | "above";

export type MarketVolumeZoneInput = {
  productName: string;
  categoryId: MarketCategoryId;
  batteryPercent: number | null;
  cosmeticGrade?: string | null;
  role: MarketIntentRole;
  userPriceKrw?: number | null;
  rollup?: MarketVolumeZoneRollupInput | null;
};

export type MarketVolumeZoneResult = {
  available: boolean;
  batteryPercent: number | null;
  batteryTierLabelKo: string | null;
  bandMinMan: number;
  bandMaxMan: number;
  anchorMan: number;
  confidence: MarketVolumeZoneConfidence;
  sampleCount: number;
  pricePosition: MarketVolumeZonePricePosition | null;
  userPriceMan: number | null;
};

function resolvePricePosition(
  userMan: number,
  minMan: number,
  maxMan: number,
): MarketVolumeZonePricePosition {
  if (userMan < minMan) {
    return "below";
  }
  if (userMan > maxMan) {
    return "above";
  }
  return "in_zone";
}

/** v1 seed guide — phone + battery tier + optional cosmetic weight. */
export function resolveMarketVolumeZone(input: MarketVolumeZoneInput): MarketVolumeZoneResult {
  const unavailable: MarketVolumeZoneResult = {
    available: false,
    batteryPercent: null,
    batteryTierLabelKo: null,
    bandMinMan: 0,
    bandMaxMan: 0,
    anchorMan: 0,
    confidence: "seed",
    sampleCount: 0,
    pricePosition: null,
    userPriceMan: null,
  };

  if (input.categoryId !== "market.phone") {
    return unavailable;
  }

  if (!isValidMarketProductName(input.productName)) {
    return unavailable;
  }

  const batteryPercent = input.batteryPercent;
  if (batteryPercent === null || batteryPercent === undefined) {
    return unavailable;
  }

  const tier = resolveMarketBatteryTier(batteryPercent);
  if (!tier) {
    return unavailable;
  }

  const productKey = normalizeMarketProductSeedKey(input.productName);
  if (!productKey) {
    return unavailable;
  }

  const cosmeticWeight = readMarketCosmeticWeight(input.cosmeticGrade);
  const seedBand = readMarketPriceBandSeed({
    productKey,
    batteryTierId: tier.id,
    cosmeticWeight,
  });

  const rollup = input.rollup;
  const useRealized = Boolean(rollup && rollup.sampleCount >= 2);
  const band = useRealized
    ? {
        minMan: rollup!.bandMinMan,
        maxMan: rollup!.bandMaxMan,
        anchorMan: rollup!.anchorMan,
      }
    : {
        minMan: seedBand.minMan,
        maxMan: seedBand.maxMan,
        anchorMan: seedBand.anchorMan,
      };

  const userPriceMan =
    input.userPriceKrw !== null &&
    input.userPriceKrw !== undefined &&
    input.userPriceKrw > 0
      ? Math.round(input.userPriceKrw / 10_000)
      : null;

  const pricePosition =
    userPriceMan !== null
      ? resolvePricePosition(userPriceMan, band.minMan, band.maxMan)
      : null;

  return {
    available: true,
    batteryPercent: Math.round(batteryPercent),
    batteryTierLabelKo: tier.labelKo,
    bandMinMan: band.minMan,
    bandMaxMan: band.maxMan,
    anchorMan: band.anchorMan,
    confidence: useRealized ? "realized" : "seed",
    sampleCount: useRealized ? rollup!.sampleCount : 0,
    pricePosition,
    userPriceMan,
  };
}
