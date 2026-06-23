import { formatPinDateLabel } from "@/lib/globe/format-pin-date-label";
import { marketCategoryLabelKo } from "@/lib/globe/market/market-category-registry";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";

function formatMarketPriceLine(record: MarketIntentRecord): string {
  const { priceMinKrw, priceMaxKrw } = record;
  if (priceMinKrw === null && priceMaxKrw === null) {
    return "가격 협의";
  }
  if (priceMinKrw !== null && priceMaxKrw !== null) {
    if (priceMinKrw === priceMaxKrw) {
      return `${Math.round(priceMinKrw / 10_000)}만원`;
    }
    return `${Math.round(priceMinKrw / 10_000)}~${Math.round(priceMaxKrw / 10_000)}만원`;
  }
  const value = priceMinKrw ?? priceMaxKrw ?? 0;
  return `${Math.round(value / 10_000)}만원`;
}

/** Read-only @중고 projection on 밖 지구 — never creates EventCandidate. */
export function projectPinClusterFromMarketIntent(
  record: MarketIntentRecord,
): PinCluster {
  const title =
    record.detail.productName.trim() ||
    record.title.trim() ||
    marketCategoryLabelKo(record.categoryId);
  const recallLine = `${marketCategoryLabelKo(record.categoryId)} · ${formatMarketPriceLine(record)}`;

  return {
    pinId: `mkt:${record.id}`,
    eventId: `mkt:${record.id}`,
    title,
    placeLabel: record.placeLabel,
    lat: record.anchorLat,
    lng: record.anchorLng,
    dateLabel: formatPinDateLabel(record.confirmedAtIso),
    startedAtIso: record.confirmedAtIso,
    evidence: {
      photoCount: record.detail.photoCount ?? 0,
      videoCount: 0,
      chatCount: 0,
      placePinCount: record.placeLabel.trim() ? 1 : 0,
    },
    recallLine,
    marketRole: record.role,
    origin: "external",
    externalTraceId: record.id,
    readOnly: true,
    authorDisplayName: null,
  };
}

export function projectMarketDiscoveryPinClusters(
  intents: readonly MarketIntentRecord[],
): PinCluster[] {
  return intents.map(projectPinClusterFromMarketIntent);
}
