import type { TrendBridgeFeature } from "@/lib/globe/trend-bridge/trend-bridge-types";

/** @ tokens for 동네 맥락 map layer — separate from Action mention registry. */
const REGISTRY: readonly TrendBridgeFeature[] = [
  {
    bridgeId: "food",
    displayName: "맛집",
    aliases: ["맛집", "meal", "식사", "밥"],
    aggregateTag: "food",
    mapStyle: "context-mist",
    sourceRef: "trend_bridge:food",
    hudVisible: true,
  },
  {
    bridgeId: "food.korean",
    displayName: "한식",
    aliases: ["한식", "한식맛집"],
    parentBridgeId: "food",
    aggregateTag: "food.korean",
    mapStyle: "context-mist",
    sourceRef: "trend_bridge:food.korean",
    hudVisible: true,
  },
  {
    bridgeId: "food.cafe",
    displayName: "카페",
    aliases: ["카페", "cafe", "커피"],
    parentBridgeId: "food",
    aggregateTag: "food.cafe",
    mapStyle: "context-mist",
    sourceRef: "trend_bridge:food.cafe",
    hudVisible: true,
  },
  {
    bridgeId: "food.delivery",
    displayName: "배달",
    aliases: ["배달", "delivery", "배민"],
    parentBridgeId: "food",
    aggregateTag: "food.delivery",
    mapStyle: "context-mist",
    sourceRef: "trend_bridge:food.delivery",
    hudVisible: false,
  },
  {
    bridgeId: "market.used",
    displayName: "중고",
    aliases: ["중고", "used", "중고거래"],
    aggregateTag: "market.used",
    mapStyle: "context-mist",
    sourceRef: "trend_bridge:market.used",
    hudVisible: true,
  },
  {
    bridgeId: "market.used_bike",
    displayName: "중고자전거",
    aliases: ["중고자전거", "자전거", "바이크"],
    parentBridgeId: "market.used",
    aggregateTag: "market.used_bike",
    mapStyle: "context-mist",
    sourceRef: "trend_bridge:market.used_bike",
    hudVisible: true,
  },
];

const byAlias = new Map<string, TrendBridgeFeature>(
  REGISTRY.flatMap((feature) =>
    feature.aliases.map((alias) => [alias.trim().toLowerCase(), feature]),
  ),
);

const byId = new Map<string, TrendBridgeFeature>(
  REGISTRY.map((feature) => [feature.bridgeId, feature]),
);

export function listTrendBridgeFeatures(): TrendBridgeFeature[] {
  return [...REGISTRY];
}

export function listTrendBridgeHudFeatures(): TrendBridgeFeature[] {
  return REGISTRY.filter((row) => row.hudVisible !== false);
}

export function resolveTrendBridgeFeature(token: string): TrendBridgeFeature | null {
  return byAlias.get(token.trim().toLowerCase()) ?? null;
}

export function getTrendBridgeFeature(bridgeId: string): TrendBridgeFeature | null {
  return byId.get(bridgeId.trim()) ?? null;
}

export function resolveTrendBridgeFromMentionInput(
  input: string,
): TrendBridgeFeature | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("@")) {
    return null;
  }
  const token = trimmed.slice(1).trim().split(/\s+/u)[0];
  if (!token) {
    return null;
  }
  return resolveTrendBridgeFeature(token);
}

export function suggestTrendBridgeFeatures(partial: string): TrendBridgeFeature[] {
  const hay = partial.trim().toLowerCase().replace(/^@/u, "");
  const rows = listTrendBridgeHudFeatures();
  if (!hay) {
    return rows;
  }
  return rows.filter(
    (row) =>
      row.displayName.toLowerCase().includes(hay) ||
      row.aliases.some((alias) => alias.toLowerCase().startsWith(hay)),
  );
}
