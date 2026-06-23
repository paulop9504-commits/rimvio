import { resolveMarketBatteryTier } from "@/lib/globe/market/price-guide/market-battery-tier";
import { normalizeMarketProductSeedKey } from "@/lib/globe/market/price-guide/market-price-guide-seed";

export type MarketRealizedPriceRow = {
  realizedPriceKrw: number;
  productName: string;
  batteryPercent: number | null;
  categoryId: string;
};

export type MarketVolumeZoneRollup = {
  sampleCount: number;
  bandMinMan: number;
  bandMaxMan: number;
  anchorMan: number;
};

export const MARKET_VOLUME_ZONE_REALIZED_MIN_SAMPLES = 2;

function readBatteryPercent(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.round(raw);
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number.parseInt(raw.replace(/\D/g, ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function filterRealizedPricesForVolumeZone(input: {
  rows: readonly MarketRealizedPriceRow[];
  productName: string;
  batteryPercent: number;
  categoryId?: string;
}): number[] {
  const productKey = normalizeMarketProductSeedKey(input.productName);
  if (!productKey) {
    return [];
  }

  const tier = resolveMarketBatteryTier(input.batteryPercent);
  if (!tier) {
    return [];
  }

  const prices: number[] = [];
  for (const row of input.rows) {
    if (input.categoryId && row.categoryId !== input.categoryId) {
      continue;
    }
    const rowKey = normalizeMarketProductSeedKey(row.productName);
    if (rowKey !== productKey) {
      continue;
    }
    const rowBattery = row.batteryPercent;
    if (rowBattery === null) {
      continue;
    }
    const rowTier = resolveMarketBatteryTier(rowBattery);
    if (!rowTier || rowTier.id !== tier.id) {
      continue;
    }
    if (row.realizedPriceKrw > 0) {
      prices.push(row.realizedPriceKrw);
    }
  }

  return prices;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

/** Build volume band from completed handshake prices (만원). */
export function buildMarketVolumeZoneRollup(
  pricesKrw: readonly number[],
): MarketVolumeZoneRollup | null {
  if (pricesKrw.length < MARKET_VOLUME_ZONE_REALIZED_MIN_SAMPLES) {
    return null;
  }

  const pricesMan = pricesKrw.map((krw) => Math.round(krw / 10_000));
  const minMan = Math.min(...pricesMan);
  const maxMan = Math.max(...pricesMan);
  const anchorMan = Math.round(median(pricesMan));

  return {
    sampleCount: pricesMan.length,
    bandMinMan: minMan,
    bandMaxMan: maxMan,
    anchorMan,
  };
}

export function readBatteryFromIntentDetail(detail: {
  productName?: string;
  prioritySlots?: Record<string, unknown>;
}): number | null {
  const fromSlot = readBatteryPercent(detail.prioritySlots?.battery_health);
  return fromSlot;
}
