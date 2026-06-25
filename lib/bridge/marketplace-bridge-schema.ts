import type { MarketCategoryId, MarketIntentRecord, MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import { marketListingConditionLabelKo } from "@/lib/globe/market/market-intent-detail";
import { marketCategoryLabelKo } from "@/lib/globe/market/market-category-registry";
import { marketIntentRoleLabelKo } from "@/lib/globe/market/market-intent-role";
import { marketPrioritySlotLabelKo } from "@/lib/globe/market/market-priority-matrix";

export const MARKETPLACE_BRIDGE_SCHEMA_VERSION = "marketplace.bridge.v1" as const;

export type MarketplaceBridgeIntent = "sell" | "buy" | "exchange" | "rent";

export type MarketplaceBridgeStatus = "draft" | "active" | "paused" | "completed";

/** Condition-based trade context — not memory / replay. */
export type MarketplaceBridgeRecord = {
  schemaVersion: typeof MARKETPLACE_BRIDGE_SCHEMA_VERSION;
  bridgeType: "marketplace";
  intent: MarketplaceBridgeIntent;
  category: MarketCategoryId;
  productName: string;
  priceMinKrw: number | null;
  priceMaxKrw: number | null;
  region: string;
  radiusKm: number;
  condition: string | null;
  conditionNote: string;
  photos: readonly string[];
  description: string;
  status: MarketplaceBridgeStatus;
  /** Category-specific slots — battery %, mileage, etc. */
  priorityFacts: Readonly<Record<string, string>>;
};

function mapRoleToIntent(role: MarketIntentRole): MarketplaceBridgeIntent {
  return role === "listing" ? "sell" : "buy";
}

function formatPrice(record: Pick<MarketIntentRecord, "priceMinKrw" | "priceMaxKrw">): string {
  const { priceMinKrw, priceMaxKrw } = record;
  if (priceMinKrw === null && priceMaxKrw === null) {
    return "가격 협의";
  }
  if (priceMinKrw !== null && priceMaxKrw !== null) {
    if (priceMinKrw === priceMaxKrw) {
      return `${priceMinKrw.toLocaleString("ko-KR")}원`;
    }
    return `${priceMinKrw.toLocaleString("ko-KR")}~${priceMaxKrw.toLocaleString("ko-KR")}원`;
  }
  const value = priceMinKrw ?? priceMaxKrw ?? 0;
  return `${value.toLocaleString("ko-KR")}원`;
}

export function projectMarketplaceBridgeFromIntent(
  record: MarketIntentRecord,
): MarketplaceBridgeRecord {
  const detail = record.detail;
  const conditionId = detail.conditionId;
  const priorityFacts: Record<string, string> = {};
  for (const [key, value] of Object.entries(detail.prioritySlots ?? {})) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    priorityFacts[key] = String(value);
  }

  return {
    schemaVersion: MARKETPLACE_BRIDGE_SCHEMA_VERSION,
    bridgeType: "marketplace",
    intent: mapRoleToIntent(record.role),
    category: record.categoryId,
    productName:
      detail.productName.trim() || record.title.trim() || marketCategoryLabelKo(record.categoryId),
    priceMinKrw: record.priceMinKrw,
    priceMaxKrw: record.priceMaxKrw,
    region: record.placeLabel.trim() || "근처",
    radiusKm: record.radiusKm,
    condition: conditionId ? marketListingConditionLabelKo(conditionId) : null,
    conditionNote: detail.detailNote.trim() || detail.memoryRecord.categoryAnswer.trim(),
    photos: detail.photoUrls ?? [],
    description: detail.detailNote.trim(),
    status: record.active ? "active" : "draft",
    priorityFacts,
  };
}

export type MarketplaceDiscoveryCard = {
  productName: string;
  roleLabel: string;
  priceLine: string;
  regionLine: string;
  conditionLine: string | null;
  factLines: readonly string[];
};

export function projectMarketplaceDiscoveryCard(
  record: MarketplaceBridgeRecord,
): MarketplaceDiscoveryCard {
  const roleLabel =
    record.intent === "sell"
      ? marketIntentRoleLabelKo("listing")
      : marketIntentRoleLabelKo("seeking");
  const factLines = Object.entries(record.priorityFacts)
    .slice(0, 4)
    .map(([key, value]) => {
      const label = marketPrioritySlotLabelKo(key as import("@/lib/globe/market/market-priority-matrix").MarketPrioritySlotId);
      return `${label} ${value}`;
    });

  return {
    productName: record.productName,
    roleLabel,
    priceLine: formatPrice(record),
    regionLine: `${record.region} · ${record.radiusKm}km`,
    conditionLine: record.condition,
    factLines,
  };
}

/** External / pin-open when only cluster projection exists. */
export function projectMarketplaceDiscoveryCardFromCluster(input: {
  title: string;
  placeLabel: string;
  marketRole: MarketIntentRole;
  recallLine?: string | null;
  radiusKm?: number | null;
}): MarketplaceDiscoveryCard {
  const roleLabel = marketIntentRoleLabelKo(input.marketRole);
  const priceLine =
    input.recallLine?.split("·").pop()?.trim() ||
    "가격 협의";
  return {
    productName: input.title.trim() || "물건",
    roleLabel,
    priceLine,
    regionLine: input.placeLabel.trim()
      ? `${input.placeLabel.trim()}${input.radiusKm ? ` · ${input.radiusKm}km` : ""}`
      : "근처",
    conditionLine: null,
    factLines: [],
  };
}
